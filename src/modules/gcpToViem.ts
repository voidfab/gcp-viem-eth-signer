import { KeyManagementServiceClient } from '@google-cloud/kms'
import { secp256k1 } from '@noble/curves/secp256k1'
import { CloudDerivedAccount } from "../global"
import * as asn1 from 'asn1js'
import { RecoveredSignatureType, SignatureType } from '@noble/curves/abstract/weierstrass'
import { toAccount, publicKeyToAddress } from "viem/accounts";
import { Signature, keccak256, hashMessage, hashTypedData, serializeTransaction, signatureToHex, hexToBytes, toHex, Hex } from 'viem'

// Utility functions

/**
 * Convert PEM string to DER format.
 * @param pem - The PEM string.
 * @returns The DER formatted byte array.
 */
const pemToDer = (pem: string): Uint8Array => {
  const base64 = pem.split('\n').slice(1, -2).join('').trim()
  return Buffer.from(base64, 'base64')
}

/**
 * Extract public key from DER formatted byte array.
 * @param bytes - DER formatted byte array.
 * @returns Public key in hexadecimal format.
 */
const publicKeyFromDer = (bytes: Uint8Array): Hex => {
  const { result } = asn1.fromBER(bytes)
  const values = (result as asn1.Sequence).valueBlock.value
  if (values.length < 2) throw new Error('Cannot get public key from ASN.1: invalid sequence')
  const value = values[1] as asn1.BitString
  return toHex(value.valueBlock.valueHexView)
}

// Key Ring-specific functions

/**
 * Get public key from GCP Key Ring.
 * @param kmsClient - The Key Management Service client.
 * @param cloudKey - The Cloud key identifier.
 * @returns Public key in hexadecimal format.
 */
const getPublicKeyFromKeyRing = async (kmsClient: KeyManagementServiceClient, cloudKey: string): Promise<Hex> => {
  const [pk] = await kmsClient.getPublicKey({ name: cloudKey })
  if (!pk.pem) throw new Error('PublicKey pem is not defined')
  return publicKeyFromDer(pemToDer(pk.pem))
}

/**
 * Sign hash using GCP Key Ring.
 * @param kmsClient - The Key Management Service client.
 * @param cloudKey - The Cloud key identifier.
 * @param hash - The hash to sign.
 * @returns The signature of the hash.
 */
const signHashWithKeyRing = async (kmsClient: KeyManagementServiceClient, cloudKey: string, hash: Uint8Array): Promise<SignatureType> => {
  const [signResponse] = await kmsClient.asymmetricSign({
    name: cloudKey,
    digest: { sha256: hash }
  })
  return secp256k1.Signature.fromDER(signResponse.signature as Buffer).normalizeS()
}

/**
 * Recover signature from hash.
 * @param signature - The signature.
 * @param publicKey - The public key.
 * @param hash - The hash to verify.
 * @returns The recovered signature with recovery bit.
 */
const recoverSignatureFromHash = async (signature: SignatureType, publicKey: Hex, hash: Uint8Array): Promise<RecoveredSignatureType> => {
  for (let i = 0; i < 4; i++) {
    const recoveredSig = signature.addRecoveryBit(i)
    const compressed = publicKey.length < 132
    const recoveredPublicKey = `0x${recoveredSig.recoverPublicKey(hash).toHex(compressed)}`
    if (publicKey === recoveredPublicKey) return recoveredSig
  }
  throw new Error('Unable to generate recovery key from signature.')
}

/**
 * Sign a message hash with GCP Key Ring and recover the full signature.
 * @param kmsClient - The Key Management Service client.
 * @param cloudKey - The Cloud key identifier.
 * @param publicKey - The public key.
 * @param msgHash - The message hash in hexadecimal format.
 * @returns The full signature object.
 */
const signMessageWithKeyRing = async (kmsClient: KeyManagementServiceClient, cloudKey: string, publicKey: Hex, msgHash: Hex): Promise<Signature> => {
  const hash = hexToBytes(msgHash)
  const signature = await signHashWithKeyRing(kmsClient, cloudKey, hash)
  const { r, s, recovery } = await recoverSignatureFromHash(signature, publicKey, hash)
  return { r: toHex(r), s: toHex(s), v: BigInt(recovery) + 27n, yParity: recovery }
}

// Main export function

/**
 * Convert an Cloud Key to a Viem account using GCP Key Management Service (KMS) for signing.
 * @param param0 - Object containing the HSM key version and the KMS client.
 * @param param0.cloudKey - The Cloud key identifier.
 * @param param0.kmsClient - (Optional) A Loaded KMS client.
 * @returns A Promise that resolves to a CloudDerivedAccount.
 */
export const gcpToViem = async ({ cloudKey, kmsClient: kmsClient_ }: { cloudKey: string, kmsClient?: KeyManagementServiceClient }): Promise<CloudDerivedAccount> => {
  const kmsClient = kmsClient_ ?? new KeyManagementServiceClient()
  const publicKey = await getPublicKeyFromKeyRing(kmsClient, cloudKey)
  const address = publicKeyToAddress(publicKey)

  const account = toAccount({
    address,
    async signMessage({ message }) {
      const signature = await signMessageWithKeyRing(kmsClient, cloudKey, publicKey, hashMessage(message))
      return signatureToHex(signature)
    },
    async signTransaction(transaction, { serializer = serializeTransaction } = {}) {
      const signableTransaction = transaction.type === 'eip4844'
        ? { ...transaction, sidecars: false }
        : transaction
      const hash = keccak256(serializer(signableTransaction))
      const signature = await signMessageWithKeyRing(kmsClient, cloudKey, publicKey, hash)
      return serializer(transaction, signature)
    },
    async signTypedData(typedData) {
      const signature = await signMessageWithKeyRing(kmsClient, cloudKey, publicKey, hashTypedData(typedData))
      return signatureToHex(signature)
    },
  })

  return { ...account, publicKey, source: 'cloud', type: 'local' }
}
