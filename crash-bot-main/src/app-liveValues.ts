import { AnchorProvider, BorshCoder, Program, Wallet } from "@coral-xyz/anchor";
import { IDL } from "./idl/dealer";
import {
  ComputeBudgetProgram,
  Connection,
  Context,
  KeyedAccountInfo,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import BN from "bn.js";
import {
  getBossWallet,
  getColdWallet,
  getFeePDA,
  getHousePDA,
  getRewardPDA,
  getRoomPDA,
  RoomAccountMeta,
  simulateSendAndConfirmTX,
} from "./utils";
import * as fs from "fs";
import config from "./config";
import axios from "axios";
import nacl from "tweetnacl";
import { decodeUTF8 } from "tweetnacl-util";

const coder = new BorshCoder(IDL);

const connection = new Connection(config.RPC_URL, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 10000,
});

const provider: AnchorProvider = new AnchorProvider(
  connection,
  new Wallet(new Keypair()),
  {
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  }
);
const PROGRAM_ADDRESS = new PublicKey(
  "DEALERKFspSo5RoXNnKAhRPhTcvJeqeEgAgZsNSjCx5E"
);

const program = new Program(IDL, PROGRAM_ADDRESS, provider);

const player: Keypair = Keypair.fromSeed(
  Uint8Array.from(
    JSON.parse(fs.readFileSync("./keypair.json", "utf-8")).slice(0, 32)
  )
);

const wallet = new Wallet(player);

const gameNumber = 2;
const roomNumber = 1;
let currentRound = new BN(0);

type AuthorizationToken = {
  exp: number;
  idToken: string;
  username: string;
  firstName: string;
  lastName: string;
};

let authKey: AuthorizationToken;

// Sign nonce
const signNonce = async () => {
  try {
    const nonceURL = `${config.COINFLIP_API}/wallets/${wallet.publicKey}/nonce`;
    const response = await axios.get(nonceURL);
    console.log("Authenticating to backend...");

    if (response.data.payload.nonce) {
      const message = `I am signing my one-time nonce: ${response.data.payload.nonce}`;
      const messageBytes = decodeUTF8(message);
      const signature = nacl.sign.detached(
        messageBytes,
        wallet.payer.secretKey
      );

      const authorizeBody = JSON.stringify({
        walletId: wallet.publicKey.toString(),
        signature: Buffer.from(signature).toString("base64"),
      });

      const authorizeResponse = await axios.post(
        `${config.COINFLIP_API}/authorize`,
        authorizeBody,
        {
          headers: {
            "Signature-Encoding": "base64",
            "Content-Type": "application/json",
          },
        }
      );
      authKey = authorizeResponse.data.payload as AuthorizationToken;

      console.log("Authenticated!");
      return true;
    }
  } catch (err) {}

  console.log("Cannot authenticate. Do you have keypair.json file?");
  return false;
};

/////// /////// /////// /////// /////// FOR FINDING VALUES OF NEW GAMES ////////////// /////// /////// /////// 

const parseNewGames = async (
  keyedAccountInfo: KeyedAccountInfo,
  context: Context
) => {
  try {
    const newGameMeta: RoomAccountMeta = {
      publicKey: keyedAccountInfo.accountId,
      account: coder.accounts.decode(
        "gameRoom",
        keyedAccountInfo.accountInfo.data
      ),
    };
     
    console.log("New game detected:");
    console.log("Public Key:", newGameMeta.publicKey.toBase58());
    console.log("Current Round:", newGameMeta.account.currentRound.toNumber());
    console.log(
      "Bets Open:",
      newGameMeta.account.currentGameStatus.betsOpen ? "Yes" : "No"
    );
    getApiResult(newGameMeta.account.currentRound.toNumber());
  } catch (err) {
    console.log(err);
    console.log("Cannot parse new games from keyedaccountinfo!");
  }
};

// // Define the structure of the payload object
interface GameResult {
  gameResult: number | null;
  gameNumber: number;
  roundId: number;
  roomId: number;
}

const allGameResults: number[][] = [];


// Helper function to check if a sequence already exists
const isSequenceUnique = (sequence: number[]): boolean => {
  return !allGameResults.some((existingSequence) =>
    existingSequence.length === sequence.length &&
    existingSequence.every((value, index) => value === sequence[index])
  );
};

const getApiResult = async (roundNumber: number) => {
  try {
    const response = await axios.get(
      `${config.DEALER_API}roundId=${roundNumber}`,
      {
        headers: { Authorization: authKey.idToken },
      }
    );
    console.log("API Response:", response.data);

    // Check if payload exists and is an array
    if (Array.isArray(response.data.payload)) {
      const nonNullResults = response.data.payload
        .map((game: GameResult) => game.gameResult) // Explicitly type the game object as GameResult
        .filter((result: number | null) => result !== null); // Filter out null values

      if (nonNullResults.length > 0) {
        // Check if the sequence is unique before adding it
        if (isSequenceUnique(nonNullResults)) {
          allGameResults.push(nonNullResults); // Add unique sequence to global array
          console.log("Added new unique sequence:", nonNullResults);
        } else {
          console.log("Sequence already exists:", nonNullResults);
        }
      } else {
        console.log("No valid game results found in the payload.");
      }

      console.log("Current allGameResults array:", allGameResults); // Log updated global array
    } else {
      console.log("Payload is not an array or does not exist.");
    }
  } catch (err) {
    console.log("Error fetching API results:", err);
} };

const init = async () => {
  if (!(await signNonce())) return;
  
  //Start fetching room changes
  provider.connection.onProgramAccountChange(
    PROGRAM_ADDRESS,
    parseNewGames,
    "confirmed"
  );
};

init();
