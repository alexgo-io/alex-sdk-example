import { AlexSDK, Currency } from "alex-sdk";
import { SimulationBuilder } from "stxer";

const sdk = new AlexSDK()
const addr = "SP212Y5JKN59YP3GYG07K3S8W5SSGE4KH6B5STXER"
const tx = await sdk.runSwap(addr, Currency.STX, Currency.ALEX, BigInt(1e8), 0n)

await SimulationBuilder.new()
    .withSender(addr)
    .addContractCall({
        contract_id: `${tx.contractAddress}.${tx.contractName}`,
        function_name: tx.functionName,
        function_args: tx.functionArgs
    })
    .run()
