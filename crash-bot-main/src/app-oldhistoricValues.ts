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


/////// /////// /////// /////// /////// FIND EXISTING OLD VALUES /////// /////// /////// /////// /////// /////// 
// // Define the structure of the payload object
interface GameResult {
  gameResult: number | null;
  gameNumber: number;
  roundId: number;
  roomId: number;
}
const allGameResults: number[] = [];

// Helper function to check if the sequence is unique
const isSequenceUnique = (sequence: number[]): boolean => {
  for (let i = 0; i < allGameResults.length; i++) {
    if (JSON.stringify(allGameResults[i]) === JSON.stringify(sequence)) {
      return false; // Sequence already exists
    }
  }
  return true; // Sequence is unique
};

// Function to get game result by roundId
const getGameResultByRoundId = (payload, roundId) => {
  const result = payload.find(game => game.roundId === roundId);
  return result ? result.gameResult : null; // Return gameResult or null if roundId not found
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

    const result = getGameResultByRoundId(roundNumber);

    // if (Array.isArray(response.data.payload)) {
    //   const nonNullResults = response.data.payload
    //     .map((game: GameResult) => game.gameResult) // Explicitly type the game object as GameResult
    //     .filter((result: number | null) => result !== null); // Filter out null values

    //   if (nonNullResults.length > 0) {
    //     // Check if the sequence is unique before adding it
    //     if (isSequenceUnique(nonNullResults)) {
    //       allGameResults.push(nonNullResults); // Add unique sequence to global array
    //       console.log("Added new unique sequence:", nonNullResults);
    //     } else {
    //       console.log("Sequence already exists:", nonNullResults);
    //     }
    //   } else {
    //     console.log("No valid game results found in the payload.");
    //   }

    //   console.log("Current allGameResults array:", allGameResults); // Log updated global array
    // } else {
    //   console.log("Payload is not an array or does not exist.");
    // }
  } catch (err) {
    console.log("Error fetching API results:", err);
  }  };

const getManyResults = async (numberOfRounds: number, currentRound: number) => {
  while (numberOfRounds > 0) {
    await getApiResults(currentRound);
    numberOfRounds -=1;
    currentRound -=1;  
  }

  // var numberOfCallsToMake = Math.floor(numberOfRounds/10); 
  // var remainder = numberOfRounds / 10;
  // while (numberOfCallsToMake > 0) {
  //   await getApiResults(currentRound);
  //   currentRound -= 10;
  //   numberOfCallsToMake -= 1;
  // }
  // while (remainder > 0) {
  //   await getApiResults(currentRound);
  //   currentRound -= 1;
  //   remainder -=1;
  // }
};


const init = async () => {
  if (!(await signNonce())) return;
  getManyResults(2, 263681);
};

init();

