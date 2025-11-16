import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { client } from "./api/$";

export const Route = createFileRoute("/inventory")({
	loader: async () => {
		// TODO: Implement auth
		// const res = await client.api.user.$get();
		// if (res.status !== 200) {
		// 	throw redirect({
		// 		to: "/login",
		// 	});
		// }
		// const user = await res.json();
		// if ("error" in user) {
		// 	throw redirect({
		// 		to: "/login",
		// 	});
		// }
		const inventoryRes = await client.api.inventory.$get();

		if (inventoryRes.status !== 200) {
			throw new Error("Failed to fetch inventory details");
		}

		const { inventory } = await inventoryRes.json();
		// console.log(inventory);

		return { inventory };
	},
	component: InventoryPage,
});

function InventoryPage() {
	const { inventory } = Route.useLoaderData();

	const [inventoryQuery, setInventoryQuery] = useState("");

	return (
		<>
			<TopBar title="Inventory Dashboard" />
			<div className="mx-6 my-2.5 flex items-center justify-between">
				<h1 className="text-3xl font-bold">Medicine Inventory</h1>
				<div className="flex items-center w-full max-w-2xl">
					<Button className="mr-2">Low Stock</Button>
					<Button className="mr-2">Near Expiry</Button>
					<Input
						type="text"
						placeholder="Search for inventory medicines here..."
						value={inventoryQuery}
						onChange={(e) => setInventoryQuery(e.target.value)}
					/>
					<Button className="ml-2">Search</Button>
				</div>
			</div>
			<Card>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Medicine</TableHead>
								<TableHead>Total Quantity</TableHead>
								<TableHead>Quick Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{inventory.map((item) => (
								<>
									<TableRow key={item.id} className="cursor-pointer">
										<TableCell>
											<div className="p-1 flex flex-wrap">
												<span className="font-semibold">
													{item.medicine.company} {item.medicine.brand}
												</span>
												<span className="mx-1 text-muted-foreground text-right">
													({item.medicine.drug}) - {item.medicine.strength} -{" "}
													{item.medicine.type}
												</span>
											</div>
										</TableCell>
										<TableCell>{item.quantity}</TableCell>
										<TableCell>Placeholder Text for Actions</TableCell>
									</TableRow>
								</>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</>
	);
}
