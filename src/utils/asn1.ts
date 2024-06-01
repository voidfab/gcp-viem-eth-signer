import * as asn1 from 'asn1js';
import { Hex, toHex } from 'viem';

/**
 * Convert PEM string to DER format.
 * @param pem - The PEM string.
 * @returns The DER formatted byte array.
 */
export const pemToDer = (pem: string): Uint8Array => {
  const base64 = pem.split('\n').slice(1, -2).join('').trim();
  return Buffer.from(base64, 'base64');
};

/**
 * Extract public key from DER formatted byte array.
 * @param bytes - DER formatted byte array.
 * @returns Public key in hexadecimal format.
 */
export const publicKeyFromDer = (bytes: Uint8Array): Hex => {
  const { result } = asn1.fromBER(bytes);
  const values = (result as asn1.Sequence).valueBlock.value;
  if (values.length < 2) throw new Error('Cannot get public key from ASN.1: invalid sequence');
  const value = values[1] as asn1.BitString;
  return toHex(value.valueBlock.valueHexView);
};
