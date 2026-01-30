import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface BarcodeDetector {
	detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
}

interface BarcodeDetectorConstructor {
	new (options: { formats: string[] }): BarcodeDetector;
}

declare global {
	interface Window {
		BarcodeDetector: BarcodeDetectorConstructor;
	}
}

interface BarcodeScannerProps {
	onScan?: (result: string) => void;
}

export function BarcodeScanner({ onScan }: BarcodeScannerProps = {}) {
	const [scanning, setScanning] = useState(false);
	const [results, setResults] = useState<string[]>([]);
	const [lastScanned, setLastScanned] = useState<string>("");
	const [isSupported, setIsSupported] = useState<boolean>(false);
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const animationRef = useRef<number | null>(null);
	const detectorRef = useRef<BarcodeDetector | null>(null);

	useEffect(() => {
		if ("BarcodeDetector" in window) {
			setIsSupported(true);
		} else {
			console.error("Barcode Detector is not supported by this browser.");
		}
	}, []);

	useEffect(() => {
		if (!scanning || !isSupported) {
			return;
		}

		const startScanning = async () => {
			try {
				detectorRef.current = new window.BarcodeDetector({
					formats: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"],
				});

				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "environment" },
				});

				streamRef.current = stream;

				if (videoRef.current) {
					videoRef.current.srcObject = stream;
					await videoRef.current.play();

					const detectBarcodes = async () => {
						if (!scanning || !videoRef.current || !detectorRef.current) {
							return;
						}

						try {
							const barcodes = await detectorRef.current.detect(
								videoRef.current,
							);

							if (barcodes.length > 0) {
								const barcode = barcodes[0];
								const decodedText = barcode.rawValue;

								if (decodedText !== lastScanned) {
									setLastScanned(decodedText);
									setResults((prev) => [decodedText, ...prev]);
									console.log("Scanned:", decodedText);
									if (onScan) {
										onScan(decodedText);
									}
								}
							}
						} catch (_err) {
							// Silent errors during detection
						}

						animationRef.current = requestAnimationFrame(detectBarcodes);
					};

					detectBarcodes();
				}
			} catch (err) {
				console.error("Failed to start camera:", err);
			}
		};

		startScanning();

		return () => {
			// Cleanup
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => {
					track.stop();
				});
			}
			if (videoRef.current) {
				videoRef.current.srcObject = null;
			}
		};
	}, [scanning, isSupported, lastScanned, onScan]);

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

	if (!isSupported) {
		return (
			<div className="p-6 text-center">
				<Card className="p-6">
					<h2 className="text-2xl font-semibold mb-4 text-destructive">
						Not Supported
					</h2>
					<p className="text-muted-foreground">
						Barcode Detection API is not supported in this browser. Please use
						Chrome/Edge on Android or enable the experimental feature in
						chrome://flags
					</p>
				</Card>
			</div>
		);
	}

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

				<div className={`w-full ${scanning ? "block" : "hidden"}`}>
					<video
						ref={videoRef}
						className="w-full h-auto rounded-lg"
						playsInline
						muted
					/>
				</div>

				{!scanning && results.length === 0 && (
					<div className="text-center py-12 text-muted-foreground">
						Click "Start Scanning" to begin
					</div>
				)}
			</Card>
		</div>
	);
}
