import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { POA_NETWORK, ZERO_HASH, mineBlock, mineGenesis } from "../src/services/consensus.ts";
import type { Block, ChainSnapshot } from "../src/types/blockchain.ts";

const blocks: Block[] = [mineGenesis(POA_NETWORK)];

for (let height = 1; height <= 5; height += 1) {
  const previous = blocks[height - 1];
  if (!previous) throw new Error("La cadena se cortó antes de completar el mock");
  blocks.push(mineBlock(previous, POA_NETWORK));
}

const snapshot: ChainSnapshot = { blocks };
assertChain(blocks);

const target = fileURLToPath(new URL("../src/data/mockChain.json", import.meta.url));
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(snapshot, null, 2)}\n`);

for (const block of blocks) {
  const committee = block.signatures.map((signature) => `${signature.signer}#${signature.satoshiId}`).join(" ");
  console.log(`#${block.header.height} nonce=${block.header.nonce} ${block.hash.slice(0, 12)} ${committee}`);
}

function assertChain(chainBlocks: Block[]): void {
  let cursor = 1;
  for (const validator of POA_NETWORK.validators) {
    if (validator.satoshiFrom !== cursor) {
      throw new Error(`Hueco de satoshis antes de ${validator.name}`);
    }
    cursor = validator.satoshiTo + 1;
  }
  if (cursor - 1 !== POA_NETWORK.totalSupply) {
    throw new Error("El suministro no cubre todos los satoshis");
  }

  const target = "0".repeat(POA_NETWORK.difficulty);
  chainBlocks.forEach((block, index) => {
    if (block.header.height !== index) throw new Error(`Altura inesperada en ${block.header.height}`);
    if (!block.hash.startsWith(target)) throw new Error(`Hash sin dificultad en #${block.header.height}`);
    if (block.signatures.length !== 3) throw new Error(`Comité incompleto en #${block.header.height}`);
    if (block.header.miner !== block.signatures[0]?.signer) {
      throw new Error(`El minero no coincide con la primera firma en #${block.header.height}`);
    }
    const expectedPrev = index === 0 ? ZERO_HASH : chainBlocks[index - 1]?.hash;
    if (block.header.prev !== expectedPrev) throw new Error(`prev roto en #${block.header.height}`);

    for (const signature of block.signatures) {
      const owner = POA_NETWORK.validators.find((validator) => validator.name === signature.signer);
      if (!owner || signature.satoshiId < owner.satoshiFrom || signature.satoshiId > owner.satoshiTo) {
        throw new Error(`Satoshi ${signature.satoshiId} fuera del rango de ${signature.signer}`);
      }
    }
  });
}
