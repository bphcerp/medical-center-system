import { OctagonX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { isBarcodeDetectionAvailable } from "@/lib/utils";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "./ui/empty";

interface BarcodeScannerProps<T> {
	validateResult: (result: string) => T | null;
	onScanSuccess?: (result: T) => void;
}

export function BarcodeScanner<T>({
	validateResult,
	onScanSuccess,
}: BarcodeScannerProps<T>) {
	const [isScanning, setIsScanning] = useState(true);
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const animationRef = useRef<number | null>(null);
	const detectorRef = useRef<BarcodeDetector | null>(null);
	const lastScanned = useRef<string>("");

	// works as long as there is no SSR
	const isSupported = isBarcodeDetectionAvailable();

	const handleScanResult = useCallback(
		(scanResult: T | null) => {
			if (scanResult) {
				setIsScanning(false);
				onScanSuccess?.(scanResult);
			}
		},
		[onScanSuccess],
	);

	const stopScanning = useCallback(() => {
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
	}, []);

	const startScanning = useCallback(async () => {
		if (!videoRef.current) return;

		setIsScanning(true);

		try {
			detectorRef.current = new window.BarcodeDetector({
				formats: ["code_128"],
			});
			const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
				(d) => d.kind === "videoinput",
			);
			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: "environment",
					deviceId:
						devices.length > 0
							? devices[devices.length - 1].deviceId
							: undefined,
					aspectRatio: { ideal: 3 / 4 },
				},
			});

			streamRef.current = stream;

			videoRef.current.srcObject = stream;
			await videoRef.current.play();

			const detectBarcodes = async () => {
				const video = videoRef.current;
				const detector = detectorRef.current;

				if (!video || !detector) {
					return;
				}

				if (video.readyState !== video.HAVE_ENOUGH_DATA) {
					animationRef.current = requestAnimationFrame(detectBarcodes);
					return;
				}

				try {
					const barcodes = await detector.detect(video);

					if (barcodes.length > 0) {
						const barcode = barcodes[0];
						const decodedText = barcode.rawValue;
						const result = validateResult(decodedText);

						if (result) {
							handleScanResult(result);
							return;
						} else if (decodedText !== lastScanned.current) {
							lastScanned.current = decodedText;
							toast.warning("This barcode is invalid.");
						}
					}
				} catch (_err) {
					// Silent errors during detection
				}

				animationRef.current = requestAnimationFrame(detectBarcodes);
			};

			detectBarcodes();
		} catch (err) {
			console.error("Failed to start camera:", err);
			toast.error("Failed to start camera.", {
				duration: Infinity,
				description: "Please check camera permissions and try again.",
				position: "top-center",
				dismissible: true,
			});
		}
	}, [validateResult, handleScanResult]);

	useEffect(() => {
		if (!isSupported) {
			console.error("Barcode Detector is not supported by this browser.");
			return;
		}

		startScanning();

		return stopScanning;
	}, [isSupported, startScanning, stopScanning]);

	if (!isSupported) {
		return (
			<div className="text-center">
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon" className="bg-destructive/10">
							<OctagonX className="text-destructive" />
						</EmptyMedia>
						<EmptyTitle className="text-2xl font-semibold text-destructive">
							Not Supported
						</EmptyTitle>
						<EmptyDescription>
							Barcode Detection API is not supported in this browser. Please use
							Chrome/Edge on Android or enable the experimental feature in
							chrome://flags
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</div>
		);
	}

	if (isScanning) {
		return (
			<div className="flex flex-col items-center gap-4">
				<video
					ref={videoRef}
					className="w-full h-auto rounded-md"
					playsInline
					muted
					aria-label="Barcode scanner camera view"
				/>
				<span className="italic">
					<span className="text-muted-foreground font-medium animate-pulse">
						Searching...
					</span>
					<span> Place your ID card in front of the camera</span>
				</span>
			</div>
		);
	}
}
