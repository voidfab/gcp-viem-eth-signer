import { KeyManagementServiceClient } from '@google-cloud/kms';
import { secp256k1 } from '@noble/curves/secp256k1';
import { Hex } from 'viem';
import { pemToDer, publicKeyFromDer } from './asn1';
import { RecoveredSignatureType, SignatureType } from '@noble/curves/abstract/weierstrass';

/**
 * Get public key from GCP Key Ring.
 * @param kmsClient - The Key Management Service client.
 * @param hsmKeyVersion - The HSM key version identifier.
 * @returns Public key in hexadecimal format.
 */
export const getPublicKeyFromKeyRing = async (kmsClient: KeyManagementServiceClient, hsmKeyVersion: string): Promise<Hex> => {
  const [pk] = await kmsClient.getPublicKey({ name: hsmKeyVersion });
  if (!pk.pem) throw new Error('PublicKey pem is not defined');
  return publicKeyFromDer(pemToDer(pk.pem));
};

/**
 * Sign hash using GCP Key Ring.
 * @param kmsClient - The Key Management Service client.
 * @param hsmKeyVersion - The HSM key version identifier.
 * @param hash - The hash to sign.
 * @returns The signature of the hash.
 */
export const signHashWithKeyRing = async (kmsClient: KeyManagementServiceClient, hsmKeyVersion: string, hash: Uint8Array): Promise<SignatureType> => {
  const [signResponse] = await kmsClient.asymmetricSign({
    name: hsmKeyVersion,
    digest: { sha256: hash }
  });
  return secp256k1.Signature.fromDER(signResponse.signature as Buffer).normalizeS();
};

/**
 * Recover signature from hash.
 * @param signature - The signature.
 * @param publicKey - The public key.
 * @param hash - The hash to verify.
 * @returns The recovered signature with recovery bit.
 * An uncompressed public key is 65 bytes long, with the first byte (always 04) indicating
 * it’s uncompressed. This translates to 130 nibbles. Including the prefix byte (04), the
 * total length is 132 hex characters (2 * 66). The variable is set to 132 to represent this
 * total length in hex,ensuring the correct handling and verification of uncompressed public
 * keys in the code.
 */
export const recoverSignatureFromHash = async (signature: SignatureType, publicKey: Hex, hash: Uint8Array): Promise<RecoveredSignatureType> => {
  for (let i = 0; i < 4; i++) {
    const recoveredSig = signature.addRecoveryBit(i);
    /*  */
    const compressed = publicKey.length < 132;
    const recoveredPublicKey = `0x${recoveredSig.recoverPublicKey(hash).toHex(compressed)}`;
    if (publicKey === recoveredPublicKey) return recoveredSig;
  }
  throw new Error('Unable to generate recovery key from signature.');
};
