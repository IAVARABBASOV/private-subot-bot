import { beginCell, Cell } from "@ton/ton";
import * as cipher from '.././cipherology/cipher';

const ENCRYPTION_PASSWORD = 'haleluya8563.';

export function createPayload<T>(data: T) : string {
    const compressedData = cipher.encryptData(data, ENCRYPTION_PASSWORD);

    const buff = Buffer.from(compressedData);

    const builder = beginCell();
    builder.storeUint(buff.length, 32); // Store compressed data length (32 bits for size)

    let remainingBuffer = buff;
    while (remainingBuffer.length > 0) {
        const chunk = remainingBuffer.slice(0, 127); // Split into 127-byte chunks
        remainingBuffer = remainingBuffer.slice(127);

        const chunkCell = beginCell()
            .storeBuffer(chunk) // Store each chunk in a separate cell
            .endCell();

        builder.storeRef(chunkCell); // Add reference to the main cell
    }

    const body = builder.endCell();

    return body.toBoc().toString('base64');
}

export function decodePayload<T>(data: string) : T {

  const bocBuffer = Buffer.from(data, "base64");

  const cell = Cell.fromBoc(bocBuffer)[0];

  const cellStrings = skipCells(cell.toString());

  let encryptedText: string = '';

  for (let i = 0; i < cellStrings.length; i++) {
    const chunk = Buffer.from(cellStrings[i], 'hex');
    encryptedText += chunk.toString('binary');
  }
  
  const decryptedData = cipher.decryptData(encryptedText, ENCRYPTION_PASSWORD);

  return decryptedData as T;
}

function skipCells(cellString: string) : string[] {
  const cells = cellString.split('x{');

  let skippedCells: string[] = [];
  for (let i = cells.length - 2; i < cells.length; i++) {
    const data = cells[i].replace('}', '').replace('\n', '').trim();
    skippedCells.push(data);
  }

  return skippedCells;
}