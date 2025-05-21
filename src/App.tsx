import {
  AppConfig,
  type FinishedTxData,
  openContractCall,
  showConnect,
  type SponsoredFinishedTxData,
  type UserData,
  UserSession,
} from "@stacks/connect";
import { STACKS_MAINNET } from "@stacks/network";
import { AlexSDK, Currency } from "alex-sdk";
import { useCallback, useEffect, useState } from "react";
import "./App.css";
import SwapIframe from "./components/SwapIframe";

const appConfig = new AppConfig([]);
const userSession = new UserSession({ appConfig });
const appDetails = {
  name: "Alex Swap Example",
  icon: "https://cdn.alexlab.co/logos/ALEX_Token.png",
};

const alex = new AlexSDK();

function App() {
  const [allCurrencies, setAllCurrencies] = useState<Currency[]>([]);
  useEffect(() => {
    alex
      .fetchSwappableCurrency()
      .then((x) => setAllCurrencies(x.map((y) => y.id)));
  }, []);
  const [userData, setUserData] = useState<UserData | undefined>(undefined);

  useEffect(() => {
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((userData) => {
        setUserData(userData);
      });
    } else if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  const onConnectWallet = useCallback(() => {
    showConnect({
      appDetails,
      onFinish: () => window.location.reload(),
      userSession,
    });
  }, []);

  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState<Currency>(Currency.STX);
  const [to, setTo] = useState<Currency>(Currency.ALEX);
  const [useSponsorTx, setUseSponsorTx] = useState(false);

  const valid =
    from != null &&
    to != null &&
    amount !== "" &&
    !Number.isNaN(Number(amount)) &&
    from !== to;

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 5,
          marginBottom: 10,
        }}
      >
        <button
          onClick={async () => {
            const result = await alex.fetchSwappableCurrency();
            console.log(result);
            alert(JSON.stringify(result, null, 2));
          }}
        >
          Get Token Infos
        </button>
        <button
          onClick={async () => {
            const result = await alex.getLatestPrices();
            console.log(result);
            alert(JSON.stringify(result, null, 2));
          }}
        >
          Get Currency Prices
        </button>
        <p>From:</p>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="amount"
        />
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value as Currency)}
        >
          {allCurrencies.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <p>to:</p>
        <select value={to} onChange={(e) => setTo(e.target.value as Currency)}>
          {allCurrencies.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      {userData == null ? (
        <button onClick={onConnectWallet}>Connect Wallet</button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <input
              type="checkbox"
              checked={useSponsorTx}
              onChange={(e) => setUseSponsorTx(e.target.checked)}
            />
            <label>Use Sponsor Tx</label>
          </div>
          <button
            disabled={!valid}
            onClick={async () => {
              const result = await alex.getFeeRate(from!, to!);
              const feeRate = Number(result) / 1e8;
              alert(
                `Fee rate is ${feeRate * 100}%, fee is ${
                  Number(amount) * feeRate
                } ${from}`,
              );
            }}
          >
            Get Fee
          </button>
          <button
            disabled={!valid}
            onClick={async () => {
              const result = useSponsorTx
                ? await alex.getAmountToForSponsorTx(
                    from!,
                    BigInt(Number(amount) * 1e8),
                    to!,
                  )
                : await alex.getAmountTo(
                    from!,
                    BigInt(Number(amount) * 1e8),
                    to!,
                  );
              alert(`You will get ${Number(result) / 1e8} ${to}`);
            }}
          >
            Get Rate
          </button>
          <button
            disabled={!valid}
            onClick={async () => {
              const routers = await alex.getRouter(from!, to!);
              alert(`Routers: ${routers.join(" -> ")}`);
            }}
          >
            Get Route
          </button>
          <button
            disabled={!valid}
            onClick={async () => {
              try {
                const stxAddress = userData!.profile.stxAddress.mainnet;
                if (useSponsorTx) {
                  const tx = await alex.runSwapForSponsoredTx(
                    stxAddress,
                    from!,
                    to!,
                    BigInt(Number(amount) * 1e8),
                    BigInt(0),
                  );
                  await openContractCall({
                    ...tx,
                    network: STACKS_MAINNET,
                    sponsored: true,
                    onFinish: async (data: SponsoredFinishedTxData) => {
                      try {
                        const txData = data.stacksTransaction.serialize()
                        const txId = await alex.broadcastSponsoredTx(txData);
                        alert(txId);
                      } catch (error) {
                        alert(`Error broadcasting sponsored transaction: ${error}`);
                      }
                    }
                  });
                } else {
                  const tx = await alex.runSwap(
                    stxAddress,
                    from!,
                    to!,
                    BigInt(Number(amount) * 1e8),
                    BigInt(0),
                  );
                  await openContractCall({
                    ...tx,
                    network: STACKS_MAINNET,
                    onFinish: async (data: FinishedTxData) => {
                      alert(data.txId);
                    },
                  });
                }
              } catch (error) {
                alert(`Error executing swap: ${error}`);
              }
            }}
          >
            Swap
          </button>
          <button
            onClick={async () => {
              const stxAddress = userData!.profile.stxAddress.mainnet;
              const balance = await alex.getBalances(stxAddress);
              console.log(balance)
              const fixBigInt = Object.fromEntries(
                Object.entries(balance).map(([k, v]) => [k, v?.toString()]),
              );
              alert(JSON.stringify(fixBigInt, null, 2));
            }}
          >
            Get balance
          </button>
        </div>
      )}
      <SwapIframe />
    </div>
  );
}

export default App;
