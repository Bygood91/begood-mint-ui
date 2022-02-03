import { useEffect, useMemo, useState, useCallback } from 'react';
import * as anchor from '@project-serum/anchor';
import confetti from "canvas-confetti";
import styled from 'styled-components';
import { Container, Snackbar, Chip } from '@material-ui/core';
import LinearProgress from '@material-ui/core/LinearProgress';
import Paper from '@material-ui/core/Paper';
import Alert from '@material-ui/lab/Alert';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletDialogButton } from '@solana/wallet-adapter-material-ui';
import {
  awaitTransactionSignatureConfirmation,
  CandyMachineAccount,
  CANDY_MACHINE_PROGRAM,
  getCandyMachineState,
  mintOneToken,
} from './candy-machine';
// import { Header } from './Header';
import { MintButton } from './MintButton';
import { GatewayProvider } from '@civic/solana-gateway-react';
import { WalletMultiButton } from "@solana/wallet-adapter-material-ui";

import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { toDate, AlertState, getAtaForMint } from './utils';
import Countdown from "react-countdown";


export interface HomeProps {
  candyMachineId?: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  txTimeout: number;
  rpcHost: string;
}


const cluster = process.env.REACT_APP_SOLANA_NETWORK!.toString();
const decimals = process.env.REACT_APP_SPL_TOKEN_DECIMALS ? +process.env.REACT_APP_SPL_TOKEN_DECIMALS!.toString() : 9;
const splTokenName = process.env.REACT_APP_SPL_TOKEN_NAME ? process.env.REACT_APP_SPL_TOKEN_NAME.toString() : "TOKEN";

const ConnectButton = styled(WalletDialogButton)`
  width: 100%;
  height: 60px;
  margin-top: 10px;
  margin-bottom: 5px;
  background: linear-gradient(180deg, #604ae5 0%, #813eee 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
`;

const Time = styled(Paper)`
  display: inline-block;
  background-color: var(--card-background-lighter-color) !important;
  margin: 5px;
  padding: 0px 24px 5px 24px;
`;

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 20px;
  margin-bottom: 20px;
  margin-right: 4%;
  margin-left: 4%;
  text-align: center;
  justify-content: center;
`;

const WalletContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
`;

const MultiConnectButton = styled(WalletMultiButton)`
//`;

const Logo = styled.div`
  flex: 0 0 auto;

  img {
    height: 60px;
  }
`;
const Menu = styled.ul`
  list-style: none;
  display: inline-flex;
  flex: 1 0 auto;

  li {
    margin: 0 12px;

    a {
      color: var(--main-text-color);
      list-style-image: none;
      list-style-position: outside;
      list-style-type: none;
      outline: none;
      text-decoration: none;
      text-size-adjust: 100%;
      touch-action: manipulation;
      transition: color 0.3s;
      padding-bottom: 15px;

      img {
        max-height: 26px;
      }
    }

    a:hover, a:active {
      color: rgb(131, 146, 161);
      border-bottom: 4px solid var(--title-text-color);
    }

  }
`;

const Wallet = styled.ul`
  flex: 0 0 auto;
  margin: 0;
  padding: 0;
`;

const WalletAmount = styled.div`
  color: black;
  width: auto;
  height: 48px;
  padding: 0 5px 0 16px;
  min-width: 48px;
  min-height: auto;
  border-radius: 24px;
  background-color: var(--main-text-color);
  box-shadow: 0px 3px 5px -1px rgb(0 0 0 / 20%), 0px 6px 10px 0px rgb(0 0 0 / 14%), 0px 1px 18px 0px rgb(0 0 0 / 12%);
  box-sizing: border-box;
  transition: background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, border 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  font-weight: 500;
  line-height: 1.75;
  text-transform: uppercase;
  border: 0;
  margin: 0;
  display: inline-flex;
  outline: 0;
  position: relative;
  align-items: center;
  user-select: none;
  vertical-align: middle;
  justify-content: flex-start;
  gap: 10px;

`;

const ShimmerTitle = styled.h1`
  margin-bottom: 0px;
  margin-top: -20px;
  text-transform: uppercase;
  animation: glow 2s ease-in-out infinite alternate;
  color: var(--main-text-color);
  @keyframes glow {
    from {
      text-shadow: 0 0 20px var(--main-text-color);
    }
    to {
      text-shadow: 0 0 30px var(--title-text-color), 0 0 10px var(--title-text-color);
    }
  }
`;

const MintContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 20px;
`;

const DesContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 20px;
`;

const Price = styled(Chip)`
  position: absolute;
  margin: 5px;
  font-weight: bold;
  font-size: 1em !important;
`;

const Image = styled.img`
  height: 400px;
  width: auto;
  border-radius: 7px;
  box-shadow: 5px 5px 40px 5px rgba(0,0,0,0.5);
`;

const NFT = styled(Paper)`
  min-width: 200px !important;
  padding: 5px 20px 20px 20px;
  flex: 1 1 auto;
`;

const Desc = styled(NFT)`
  text-align: left;
  padding-top: 0px;
`;

const LogoAligner = styled.div`
  display: flex;
  align-items: center;

  img {
    max-height: 35px;
    margin-right: 10px;
  }
`;

const GoldTitle = styled.h2`
  color: var(--title-text-color);
`;

const ShimmerTitle2 = styled.h2`
  margin:5px;
  text-transform: uppercase;
  animation: glow 2s ease-in-out infinite alternate;
  color: var(--main-text-color);
  @keyframes glow {
    from {
      text-shadow: 0 0 20px var(--main-text-color);
    }
    to {
      text-shadow: 0 0 30px var(--title-text-color), 0 0 10px var(--title-text-color);
    }
  }
`;

const MintButtonContainer = styled.div`


  button.MuiButton-contained:not(.MuiButton-containedPrimary) {
    color: #ffffff;
  }

  button.MuiButton-contained:not(.MuiButton-containedPrimary).Mui-disabled {
    color: #363333;
    background-color : rgba(255, 255, 255, 0.12);
  }

  button.MuiButton-contained:not(.MuiButton-containedPrimary):hover,
  button.MuiButton-contained:not(.MuiButton-containedPrimary):focus {
    -webkit-animation: pulse 1s;
    animation: pulse 1s;
    box-shadow: 0 0 0 2em rgba(255, 255, 255, 0);
  }

  @-webkit-keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 #ef8f6e;
    }
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 #ef8f6e;
    }
  }
`;

const BorderLinearProgress = styled(LinearProgress)`
  margin: 20px 0;
  height: 10px !important;
  border-radius: 30px;
  border: 2px solid white;
  box-shadow: 5px 5px 40px 5px rgba(0,0,0,0.5);
  > div.MuiLinearProgress-bar1Determinate {
    border-radius: 30px !important;
    background-image: linear-gradient(270deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0.5));
  }
`;

const SolExplorerLink = styled.a`
  color: var(--title-text-color);
  border-bottom: 1px solid var(--title-text-color);
  font-weight: bold;
  list-style-image: none;
  list-style-position: outside;
  list-style-type: none;
  outline: none;
  text-decoration: none;
  text-size-adjust: 100%;

  :hover {
    border-bottom: 2px solid var(--title-text-color);
  }
`;

const Home = (props: HomeProps) => {
  const [isUserMinting, setIsUserMinting] = useState(false);
  const [payWithSplToken, setPayWithSplToken] = useState(false);
  const [price, setPrice] = useState(0);
  const [priceLabel, setPriceLabel] = useState<string>("SOL");
  const [whitelistPrice, setWhitelistPrice] = useState(0);
  const [whitelistEnabled, setWhitelistEnabled] = useState(false);
  const [whitelistTokenBalance, setWhitelistTokenBalance] = useState(0);
  const [showMint, setShowMint] = useState(false); // true when countdown completes or whitelisted
  const [candyMachine, setCandyMachine] = useState<CandyMachineAccount>();
  const [balance, setBalance] = useState<number>();
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  const [itemsRemaining, setItemsRemaining] = useState(0);
  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [solanaExplorerLink, setSolanaExplorerLink] = useState<string>("");

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: '',
    severity: undefined,
  });

  const rpcUrl = props.rpcHost;
  const wallet = useWallet();

  const anchorWallet = useMemo(() => {
    if (
      !wallet ||
      !wallet.publicKey ||
      !wallet.signAllTransactions ||
      !wallet.signTransaction
    ) {
      return;
    }

    return {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
    } as anchor.Wallet;
  }, [wallet]);


  const refreshCandyMachineState = useCallback(async () => {
    if (!anchorWallet) return;

    if (props.candyMachineId) {
      try {
        const cndy = await getCandyMachineState(
          anchorWallet,
          props.candyMachineId,
          props.connection,
        );

        setCandyMachine(cndy);
        setItemsAvailable(cndy.state.itemsAvailable);
        setItemsRemaining(cndy.state.itemsRemaining);
        setItemsRedeemed(cndy.state.itemsRedeemed);

        var divider = 1;
        if (decimals) {
          divider = +('1' + new Array(decimals).join('0').slice() + '0');
        }

        // detect if using spl-token to mint
        if (cndy.state.tokenMint) {
          setPayWithSplToken(true);
          // Customize your SPL-TOKEN Label HERE
          // TODO: get spl-token metadata name
          setPriceLabel(splTokenName);
          setPrice(cndy.state.price.toNumber() / divider);
          setWhitelistPrice(cndy.state.price.toNumber() / divider);
        } else {
          setPrice(cndy.state.price.toNumber() / LAMPORTS_PER_SOL);
          setWhitelistPrice(cndy.state.price.toNumber() / LAMPORTS_PER_SOL);
        }

        // fetch whitelist token balance
        if (cndy.state.whitelistMintSettings) {
          setWhitelistEnabled(true);
          if (cndy.state.whitelistMintSettings.discountPrice !== null && cndy.state.whitelistMintSettings.discountPrice !== cndy.state.price) {
            if (cndy.state.tokenMint) {
              setWhitelistPrice(cndy.state.whitelistMintSettings.discountPrice?.toNumber() / divider);
            } else {
              setWhitelistPrice(cndy.state.whitelistMintSettings.discountPrice?.toNumber() / LAMPORTS_PER_SOL);
            }
          }
          let balance = 0;
          try {
            const tokenBalance =
              await props.connection.getTokenAccountBalance(
                (
                  await getAtaForMint(
                    cndy.state.whitelistMintSettings.mint,
                    anchorWallet.publicKey,
                  )
                )[0],
              );

            balance = tokenBalance?.value?.uiAmount || 0;
          } catch (e) {
            console.error(e);
            balance = 0;
          }
          setWhitelistTokenBalance(balance);
          setShowMint(balance > 0);
        } else {
          setWhitelistEnabled(false);
          setWhitelistTokenBalance(0);
        }

      } catch (e) {
        console.log('There was a problem fetching Candy Machine state');
        console.log(e);
      }

    }
  }, [anchorWallet, props.candyMachineId, props.connection]);

  const renderCounter = ({ days, hours, minutes, seconds }: any) => {
    return (
      <div><Time elevation={1}><h1>{days}</h1><br />Days</Time><Time elevation={1}><h1>{hours}</h1>
        <br />Hours</Time><Time elevation={1}><h1>{minutes}</h1><br />Mins</Time><Time elevation={1}>
          <h1>{seconds}</h1><br />Secs</Time></div>
    );
  };

  function throwConfetti(): void {
    confetti({
      particleCount: 400,
      spread: 70,
      origin: { y: 0.6 },
    });
  }

  function displayRefresh(mintPublicKey: any): void {
    let remaining = itemsRemaining - 1;
    setItemsRemaining(remaining);
    setIsSoldOut(remaining === 0);
    if (whitelistTokenBalance && whitelistTokenBalance > 0) {
      let balance = whitelistTokenBalance - 1;
      setWhitelistTokenBalance(balance);
      setShowMint(balance > 0);
    }
    setItemsRedeemed(itemsRedeemed + 1);
    const solFeesEstimation = 0.012; // approx
    if (!payWithSplToken && balance && balance > 0) {
      setBalance(balance - (whitelistEnabled ? whitelistPrice : price) - solFeesEstimation);
    }
    setSolanaExplorerLink(cluster === "devnet" || cluster === "testnet"
      ? ("https://explorer.solana.com/address/" + mintPublicKey + "?cluster=" + cluster)
      : ("https://explorer.solana.com/address/" + mintPublicKey));
  };



  const onMint = async () => {
    try {
      setIsUserMinting(true);
      document.getElementById('#identity')?.click();
      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        const mint = anchor.web3.Keypair.generate();
        const mintTxId = (
          await mintOneToken(candyMachine, wallet.publicKey)
        )[0];

        let status: any = { err: true };
        if (mintTxId) {
          status = await awaitTransactionSignatureConfirmation(
            mintTxId,
            props.txTimeout,
            props.connection,
            true,
          );
        }

        if (status && !status.err) {
          setAlertState({
            open: true,
            message: 'Congratulations! Mint succeeded!',
            severity: 'success',
          })
          // update front-end amounts
          displayRefresh(mint.publicKey);
          throwConfetti();
        } else {
          setAlertState({
            open: true,
            message: 'Mint failed! Please try again!',
            severity: 'error',
          });
        }
      }
    } catch (error: any) {
      let message = error.msg || 'Minting failed! Please try again!';
      if (!error.msg) {
        if (!error.message) {
          message = 'Transaction Timeout! Please try again.';
        } else if (error.message.indexOf('0x137')) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf('0x135')) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          window.location.reload();
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: 'error',
      });
    } finally {
      setIsUserMinting(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (anchorWallet) {
        const balance = await props.connection.getBalance(anchorWallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [anchorWallet, props.connection]);

  useEffect(() => {
    refreshCandyMachineState();
  }, [
    anchorWallet,
    props.candyMachineId,
    props.connection,
    // refreshCandyMachineState,
  ]);

  return (

    <main>
      <MainContainer>
        < WalletContainer>
          <Logo>
            <a href="http://localhost:3000/" target="_blank" rel="noopener noreferrer"><img alt=""
              src="logo.png" /></a></Logo>

          <Wallet>
            {anchorWallet ?
              <WalletAmount>{(balance || 0).toLocaleString()} SOL<MultiConnectButton /></WalletAmount> :
              <MultiConnectButton>Connect Wallet</MultiConnectButton>}
          </Wallet>
        </WalletContainer>
        <ShimmerTitle style={{ fontSize: "3.6em" }}>{

          !anchorWallet ? "Connect Your Wallet" :
            candyMachine?.state.isSoldOut ? "SOLD OUT !" :
              candyMachine?.state.isPresale ? "PRESALE ACCESS !" :
                candyMachine?.state.isActive ? "MINT IS LIVE !" :
                  candyMachine ? "COMMING SOON !" :
                    "Gold'o Hero"}
        </ShimmerTitle>
        <MintContainer>
          <DesContainer>
            <NFT elevation={3}>
              <ShimmerTitle2 style={{ fontSize: '2.5em' }} >Gold'O Hero</ShimmerTitle2>
              <br />
              <div><Price
                label={showMint && whitelistEnabled ? (whitelistPrice + " " + priceLabel) : (price + " " + priceLabel)} />
                <Image
                  src="goldMin.jpg"
                  alt="NFT To Mint"
                  style={{ width: 'auto', height: 'auto', maxWidth: "100%" }} />
              </div>

              <br />

              {anchorWallet && showMint && whitelistEnabled && whitelistTokenBalance &&
                (candyMachine?.state.whitelistMintSettings?.mode.burnEveryTime ?
                  <h3>You have {whitelistTokenBalance} whitelist mint(s) remaining.</h3> :
                  <h3>You are Whiteslisted !</h3>)}


              {anchorWallet && showMint &&
                /* <p>Total Minted : {100 - (itemsRemaining * 100 / itemsAvailable)}%</p>}*/
                <h3>TOTAL MINTED : {itemsRedeemed} / {itemsAvailable} </h3>}
              {anchorWallet && showMint && <BorderLinearProgress variant="determinate"
                value={100 - (itemsRemaining * 100 / itemsAvailable)} />}

              <br />

              <MintButtonContainer>
                {!showMint && candyMachine?.state.goLiveDate ? (
                  <Countdown
                    date={toDate(candyMachine?.state.goLiveDate)}
                    onMount={({ completed }) => completed && setShowMint(true)}
                    onComplete={() => {
                      setShowMint(true);
                      // refreshCandyMachineState();
                    }}
                    renderer={renderCounter}
                  />) : (
                  !anchorWallet ? (
                    <ConnectButton>Connect Wallet</ConnectButton>
                  ) :
                    candyMachine?.state.gatekeeper &&
                      anchorWallet.publicKey &&
                      anchorWallet.signTransaction ? (
                      <GatewayProvider
                        wallet={{
                          publicKey:
                            anchorWallet.publicKey ||
                            new PublicKey(CANDY_MACHINE_PROGRAM),
                          //@ts-ignore
                          signTransaction: wallet.signTransaction,
                        }}
                        // // Replace with following when added
                        // gatekeeperNetwork={candyMachine.state.gatekeeper_network}
                        gatekeeperNetwork={
                          candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                        } // This is the ignite (captcha) network
                        /// Don't need this for mainnet
                        clusterUrl={rpcUrl}
                        options={{ autoShowModal: false }}
                      >
                        <MintButton
                          candyMachine={candyMachine}
                          isMinting={isUserMinting}
                          //isActive={isActive}
                          isSoldOut={isSoldOut}
                          onMint={onMint}
                          whitelistTokenBalance={whitelistTokenBalance}
                        />
                      </GatewayProvider>
                    ) : (
                      <MintButton
                        candyMachine={candyMachine}
                        isMinting={isUserMinting}
                        //isActive={isActive}
                        isSoldOut={isSoldOut}
                        onMint={onMint}
                        whitelistTokenBalance={whitelistTokenBalance}
                      />
                    ))}
              </MintButtonContainer>

              <br />

              {anchorWallet && showMint && solanaExplorerLink &&
                <SolExplorerLink href={solanaExplorerLink} target="_blank">View on Solana
                  Explorer</SolExplorerLink>}
            </NFT>

          </DesContainer>


          <DesContainer>
            <Desc elevation={2}>
              <LogoAligner><img src="logo.png" alt=""></img><GoldTitle>INTRODUCTION</GoldTitle></LogoAligner>
              <pre style={{ backgroundColor: "black", padding: "30px" }}>
                <p>CandyMachine is Active : {candyMachine?.state.isActive ? 'yes' : 'no'}</p>
                <p>show Mint Access : {showMint ? 'yes' : 'no'}</p>
                <p>CandyMachine is Presale : {candyMachine?.state.isPresale ? 'yes' : 'no'}</p>
                <p>CandyMachine is SoldOut : {candyMachine?.state.isSoldOut ? 'yes' : 'no'}</p>
                <br />
                <p>NFT Dispo : {itemsAvailable}</p>
                <p>NFT Vendu : {itemsRedeemed}</p>
                <p>NFT Restant : {itemsRemaining}</p>
                <br />
                <p>Whitelist MintSettings : {whitelistEnabled ? 'yes' : 'no'}</p>
                <p>Adresse WhiteToken : {candyMachine?.state.whitelistMintSettings?.mint.toString()}</p>
                <p>WhiteToken Balance : {whitelistTokenBalance.toString()}</p>
                <p>WhiteToken Burn : {candyMachine?.state.whitelistMintSettings?.mode.burnEveryTime ? 'yes' : 'no'}</p>
                <br />
                <p>Whitelist Settings presale : {candyMachine?.state.whitelistMintSettings?.presale ? 'yes' : 'no'}</p>
                <p>Price : {price}  {priceLabel}</p>
                <p>whitelistPrice : {whitelistPrice} {whitelistEnabled && whitelistTokenBalance ? priceLabel : priceLabel}</p>
                {/*<p>token secondaire accepté : {candyMachine?.state.tokenMint ? candyMachine?.state.tokenMint.toString() : "null"}</p>*/}

              </pre>

            </Desc>


          </DesContainer>
        </MintContainer>
      </MainContainer>
      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>

      </Snackbar>
    </main>

  );
};

export default Home;
