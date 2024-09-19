import { AccountDataResponse, getNodeInfo, richFetch } from 'ts-clarity';
import { Block } from '@stacks/stacks-blockchain-api-types';
import { StacksMainnet } from '@stacks/network';
import {
    AnchorMode,
    ClarityValue,
    PostConditionMode,
    type StacksTransaction,
    bufferCV,
    contractPrincipalCV,
    makeUnsignedContractCall,
    makeUnsignedContractDeploy,
    makeUnsignedSTXTokenTransfer,
    serializeCV,
    stringAsciiCV,
    tupleCV,
    uintCV,
} from '@stacks/transactions';
import { c32addressDecode } from 'c32check';

// current beta api endpoint
const SIMULATION_API_ENDPOINT = 'https://api.stxer.xyz/simulations';

function runTx(tx: StacksTransaction) {
    // type 0: run transaction
    return tupleCV({ type: uintCV(0), data: bufferCV(tx.serialize()) });
}

export interface SimulationEval {
    contract_id: string;
    code: string;
}

export function runEval({ contract_id, code }: SimulationEval) {
    const [contract_address, contract_name] = contract_id.split('.');
    // type 1: eval arbitrary code inside a contract
    return tupleCV({
        type: uintCV(1),
        data: bufferCV(
            serializeCV(
                tupleCV({
                    contract: contractPrincipalCV(contract_address, contract_name),
                    code: stringAsciiCV(code),
                })
            )
        ),
    });
}

export async function runSimulation(
    block_hash: string,
    block_height: number,
    txs: (StacksTransaction | SimulationEval)[]
) {
    const body = Buffer.concat([
        Buffer.from('sim-v1'),
        Buffer.alloc(8),
        Buffer.from(
            block_hash.startsWith('0x') ? block_hash.substring(2) : block_hash,
            'hex'
        ),
        ...txs
            .map((t) => {
                return 'contract_id' in t && 'code' in t ? runEval(t) : runTx(t);
            })
            .map((t) => serializeCV(t)),
    ]);
    body.writeBigUInt64BE(BigInt(block_height), 6);
    const rs = await fetch(SIMULATION_API_ENDPOINT, {
        method: 'POST',
        body,
    }).then(async (rs) => {
        const response = await rs.text();
        if (!response.startsWith('{')) {
            throw new Error(`failed to submit simulation: ${response}`);
        }
        // console.log(response);
        return JSON.parse(response) as { id: string };
    });
    return rs.id;
}

export class SimulationBuilder {
    public static new() {
        return new SimulationBuilder();
    }
    private block = NaN;
    private sender = '';
    private steps: (
        | {
            // contract call
            contract_id: string;
            function_name: string;
            function_args?: ClarityValue[];
            sender: string;
            fee: number;
        }
        | {
            // contract deploy
            contract_name: string;
            source_code: string;
            deployer: string;
            fee: number;
        }
        | {
            // STX transfer
            recipient: string;
            amount: number;
            sender: string;
            fee: number;
        }
        | SimulationEval
    )[] = [];

    public useBlockHeight(block: number) {
        this.block = block;
        return this;
    }
    public withSender(address: string) {
        this.sender = address;
        return this;
    }
    public addSTXTransfer(params: {
        recipient: string;
        amount: number;
        sender?: string;
        fee?: number;
    }) {
        if (params.sender == null && this.sender === '') {
            throw new Error(
                'Please specify a sender with useSender or adding a sender paramenter'
            );
        }
        this.steps.push({
            ...params,
            sender: params.sender ?? this.sender,
            fee: params.fee ?? 0,
        });
        return this;
    }
    public addContractCall(params: {
        contract_id: string;
        function_name: string;
        function_args?: ClarityValue[];
        sender?: string;
        fee?: number;
    }) {
        if (params.sender == null && this.sender === '') {
            throw new Error(
                'Please specify a sender with useSender or adding a sender paramenter'
            );
        }
        this.steps.push({
            ...params,
            sender: params.sender ?? this.sender,
            fee: params.fee ?? 0,
        });
        return this;
    }
    public addContractDeploy(params: {
        contract_name: string;
        source_code: string;
        deployer?: string;
        fee?: number;
    }) {
        if (params.deployer == null && this.sender === '') {
            throw new Error(
                'Please specify a deployer with useSender or adding a deployer paramenter'
            );
        }
        this.steps.push({
            ...params,
            deployer: params.deployer ?? this.sender,
            fee: params.fee ?? 0,
        });
        return this;
    }
    public addEvalCode(inside_contract_id: string, code: string) {
        this.steps.push({
            contract_id: inside_contract_id,
            code,
        });
        return this;
    }
    public addMapRead(contract_id: string, map: string, key: string) {
        this.steps.push({
            contract_id,
            code: `(map-get ${map} ${key})`,
        });
        return this;
    }
    public addVarRead(contract_id: string, variable: string) {
        this.steps.push({
            contract_id,
            code: `(var-get ${variable})`,
        });
        return this;
    }

    private async getBlockInfo() {
        if (Number.isNaN(this.block)) {
            const { stacks_tip_height } = await getNodeInfo();
            this.block = stacks_tip_height;
        }
        const info: Block = await richFetch(
            `https://api.hiro.so/extended/v1/block/by_height/${this.block}?unanchored=true`
        ).then((r) => r.json());
        if (
            info.height !== this.block ||
            typeof info.hash !== 'string' ||
            !info.hash.startsWith('0x')
        ) {
            throw new Error(
                `failed to get block info for block height ${this.block}`
            );
        }
        return {
            block_height: this.block,
            block_hash: info.hash.substring(2),
            index_block_hash: info.index_block_hash.substring(2),
        };
    }

    public async run() {
        console.log(
            `--------------------------------
This product can never exist without your support!

We receive sponsorship funds with:
SP212Y5JKN59YP3GYG07K3S8W5SSGE4KH6B5STXER

Feedbacks and feature requests are welcome.
To get in touch: contact@stxer.xyz
--------------------------------`
        );
        const block = await this.getBlockInfo();
        console.log(
            `Using block height ${block.block_height} hash 0x${block.block_hash} to run simulation.`
        );
        const txs: (StacksTransaction | SimulationEval)[] = [];
        const nonce_by_address = new Map<string, number>();
        const nextNonce = async (sender: string) => {
            let nonce = nonce_by_address.get(sender);
            if (nonce == null) {
                const url = `https://api.hiro.so/v2/accounts/${sender}?proof=${false}&tip=${block.index_block_hash
                    }`;
                const account: AccountDataResponse = await richFetch(url).then((r) =>
                    r.json()
                );
                nonce_by_address.set(sender, account.nonce + 1);
                return account.nonce;
            }
            nonce_by_address.set(sender, nonce + 1);
            return nonce;
        };
        for (const step of this.steps) {
            if ('sender' in step && 'function_name' in step) {
                const nonce = await nextNonce(step.sender);
                const [contractAddress, contractName] = step.contract_id.split('.');
                const tx = await makeUnsignedContractCall({
                    contractAddress,
                    contractName,
                    functionName: step.function_name,
                    functionArgs: step.function_args ?? [],
                    nonce,
                    network: new StacksMainnet(),
                    publicKey: '',
                    postConditionMode: PostConditionMode.Allow,
                    anchorMode: AnchorMode.Any,
                    fee: step.fee,
                });
                tx.auth.spendingCondition.signer = c32addressDecode(step.sender)[1];
                txs.push(tx);
            } else if ('sender' in step && 'recipient' in step) {
                const nonce = await nextNonce(step.sender);
                const tx = await makeUnsignedSTXTokenTransfer({
                    recipient: step.recipient,
                    amount: step.amount,
                    nonce,
                    network: new StacksMainnet(),
                    publicKey: '',
                    anchorMode: AnchorMode.Any,
                    fee: step.fee,
                });
                tx.auth.spendingCondition.signer = c32addressDecode(step.sender)[1];
                txs.push(tx);
            } else if ('deployer' in step) {
                const nonce = await nextNonce(step.deployer);
                const tx = await makeUnsignedContractDeploy({
                    contractName: step.contract_name,
                    codeBody: step.source_code,
                    nonce,
                    network: new StacksMainnet(),
                    publicKey: '',
                    postConditionMode: PostConditionMode.Allow,
                    anchorMode: AnchorMode.Any,
                    fee: step.fee,
                });
                tx.auth.spendingCondition.signer = c32addressDecode(step.deployer)[1];
                txs.push(tx);
            } else if ('code' in step) {
                txs.push(step);
            } else {
                console.log(`Invalid simulation step:`, step);
            }
        }
        const id = await runSimulation(block.block_hash, block.block_height, txs);
        console.log(
            `Simulation will be available at: https://stxer.xyz/simulations/mainnet/${id}`
        );
        return id;
    }
}
