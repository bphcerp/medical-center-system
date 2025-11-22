export type Batch = {
	id: number;
	batchNum: string;
	quantity: number;
	expiry: string;
};

export type Medicine = {
	id: number;
	drug: string;
	company: string;
	brand: string;
	strength: string;
	type: string;
	price: number;
};
