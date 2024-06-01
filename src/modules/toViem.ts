import { KeyManagementServiceClient } from '@google-cloud/kms';
import { CloudDerivedAccount } from "../global"
import { toAccount, publicKeyToAddress } from 'viem/accounts';
import { Signature, keccak256, hashMessage, hashTypedData, serializeTransaction, signatureToHex, hexToBytes, toHex, Hex } from 'viem';
import { getPublicKeyFromKeyRing, signHashWithKeyRing, recoverSignatureFromHash } from '../utils/gcp';

/**
 * Sign a message with GCP Key Ring.
 * @param kmsClient - The Key Management Service client.
 * @param cloudKey - The Cloud key identifier.
 * @param publicKey - The public key.
 * @param msgHash - The message hash.
 * @returns The signature.
 */
const signMessageWithKeyRing = async (kmsClient: KeyManagementServiceClient, cloudKey: string, publicKey: Hex, msgHash: Hex): Promise<Signature> => {
  const hash = hexToBytes(msgHash);
  const signature = await signHashWithKeyRing(kmsClient, cloudKey, hash);
  const { r, s, recovery } = await recoverSignatureFromHash(signature, publicKey, hash);
  return { r: toHex(r), s: toHex(s), v: BigInt(recovery) + 27n, yParity: recovery };
};

/**
 * Convert an Cloud Key to a Viem account using GCP Key Management Service (KMS) for signing.
 * GetPublicKeyRequest
 * @param cloudKey - key resource path to utilize.
 * @returns A Viem account.
 */
export async function toViem(cloudKey: string): Promise<CloudDerivedAccount> {
  const kmsClient = new KeyManagementServiceClient()
  const publicKey = await getPublicKeyFromKeyRing(kmsClient, cloudKey)
  const address = publicKeyToAddress(publicKey)

  // Use an async IIFE to handle asynchronous operations during initialization
  return (async () => {
    const publicKey = await getPublicKeyFromKeyRing(kmsClient, cloudKey);
    const account = toAccount({
      address,
      async signMessage({ message }) {
        const signature = await signMessageWithKeyRing(kmsClient, cloudKey, publicKey, hashMessage(message));
        return signatureToHex(signature);
      },
      async signTransaction(transaction, { serializer = serializeTransaction } = {}) {
        const hash = keccak256(serializer(transaction));
        const signature = await signMessageWithKeyRing(kmsClient, cloudKey, publicKey, hash);
        return serializer(transaction, signature);
      },
      async signTypedData(typedData) {
        const signature = await signMessageWithKeyRing(kmsClient, cloudKey, publicKey, hashTypedData(typedData));
        return signatureToHex(signature);
      }
    });

    return { ...account, publicKey, source: 'cloud' };
  })();
}
