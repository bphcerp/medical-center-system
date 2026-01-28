import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface ScanResult {
	decodedText: string;
	timestamp: number;
}

export function BarcodeScanner() {
	const [scanning, setScanning] = useState(false);
	const [results, setResults] = useState<ScanResult[]>([]);
	const [lastScanned, setLastScanned] = useState<string>("");
	const scannerRef = useRef<Html5Qrcode | null>(null);
	const readerElementId = "barcode-reader";

	useEffect(() => {
		if (scanning) {
			const scanner = new Html5Qrcode(readerElementId);
			scannerRef.current = scanner;

			const config = {
				fps: 10,
				qrbox: { width: 350, height: 250 },
				aspectRatio: 1.777778,
			};

			scanner
				.start(
					{ facingMode: "environment" },
					config,
					(decodedText) => {
						if (decodedText !== lastScanned) {
							setLastScanned(decodedText);
							setResults((prev) => [
								{ decodedText, timestamp: Date.now() },
								...prev,
							]);
							console.log("Scanned:", decodedText);
						}
					},
					() => {},
				)
				.catch((err) => {
					console.error("Failed to start scanner:", err);
				});

			return () => {
				scanner
					.stop()
					.then(() => {
						scanner.clear();
					})
					.catch((err) => console.error("Error stopping scanner:", err));
			};
		}
	}, [scanning, lastScanned]);

	const handleToggleScanning = () => {
		setScanning(!scanning);
		if (scanning) {
			setLastScanned("");
		}
	};

	const handleClearResults = () => {
		setResults([]);
		setLastScanned("");
	};

	return (
		<div className="flex flex-col items-center gap-6 p-6 max-w-4xl mx-auto">
			<Card className="w-full p-6">
				<h2 className="text-2xl font-semibold mb-4">Barcode Scanner</h2>
				
				<div className="flex gap-3 mb-4">
					<Button onClick={handleToggleScanning} size="lg">
						{scanning ? "Stop Scanning" : "Start Scanning"}
					</Button>
					
					{results.length > 0 && (
						<Button onClick={handleClearResults} variant="outline" size="lg">
							Clear Results
						</Button>
					)}
				</div>

				<div
					id={readerElementId}
					className={`w-full ${scanning ? "block" : "hidden"}`}
				/>

				{!scanning && results.length === 0 && (
					<div className="text-center py-12 text-muted-foreground">
						Click "Start Scanning" to begin
					</div>
				)}
			</Card>

			{results.length > 0 && (
				<div className="w-full">
					<h3 className="text-lg font-semibold mb-2">
						Scanned: ({results.length})
					</h3>
					<ul className="list-disc list-inside space-y-1">
						{results.map((result, index) => (
							<li key={`${result.timestamp}-${index}`} className="font-mono">
								{result.decodedText}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
