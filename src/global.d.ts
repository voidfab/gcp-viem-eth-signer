import { LocalAccount } from "viem/accounts";
import { Hex } from "viem";

// Define the CloudDerivedAccount type which is a LocalAccount with a 'cloud' source.
export type CloudDerivedAccount = LocalAccount<'cloud'>;

// Define a Signature type.
export type Signature = {
    r: Hex;        // The `r` value of the signature.
    s: Hex;        // The `s` value of the signature.
    v: number;     // The `v` value (recovery id) of the signature.
};
