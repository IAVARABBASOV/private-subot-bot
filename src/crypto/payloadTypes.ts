export interface PayloadData { }

export interface TransactionPayloadData extends PayloadData  {
    owner: string,
    username: string,
    channel: string,
    plan: string,
    time: number,
}