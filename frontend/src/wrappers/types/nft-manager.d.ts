export type NftManagerInitData = {
	owner: Address;
	debug: bigint;
	mintPrice: bigint;
	maxSupply: bigint;
};

export type SetNftCollectionAddress = {
	$$type: 'SetNftCollectionAddress';
	nftCollectionAddress: Address;
};

export type SendMintParams = {
	queryId?: number;
	nextItemIndex: number;
	itemOwner: Address;
};

export type NftManagerData = {
	owner: Address;
	debug: number;
	nftCollectionAddress: Address;
	mintPrice: bigint;
	maxSupply: number;
};

export type MintSafe = {
	$$type: 'MintSafe';
	queryId: int;
	nextItemIndex: int;
	itemOwner: Address;
};
