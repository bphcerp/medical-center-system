import Quagga, {
	type QuaggaJSConfigObject,
	type QuaggaJSResultCallbackFunction,
	type QuaggaJSResultObject,
} from "@ericblade/quagga2";
import {
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { Button } from "./ui/button";

// function getMedian(arr: (number | undefined)[]) {
// 	const newArr = [...arr]; // copy the array before sorting, otherwise it mutates the array passed in, which is generally undesireable
// 	newArr.sort((a, b) => a - b);
// 	const half = Math.floor(newArr.length / 2);
// 	if (newArr.length % 2 === 1) {
// 		return newArr[half];
// 	}
// 	return (newArr[half - 1] + newArr[half]) / 2;
// }

// function getMedianOfCodeErrors(
// 	decodedCodes: QuaggaJSResultObject["codeResult"]["decodedCodes"],
// ) {
// 	const errors = decodedCodes
// 		.filter((d) => d.error !== undefined)
// 		.map((d) => d.error as number);

// 	const medianOfErrors = getMedian(errors);
// 	return medianOfErrors;
// }

const defaultConstraints: MediaTrackConstraints = {
	width: { min: 1080 },
};

const defaultLocatorSettings: QuaggaJSConfigObject["locator"] = {
	patchSize: "medium",
	halfSample: true,
	willReadFrequently: true,
	debug: {
		showFoundPatches: true,
		showPatches: true,
		showSkeleton: true,
	},
};

type QuaggaJSReaders = Exclude<
	Exclude<QuaggaJSConfigObject["decoder"], undefined>["readers"],
	undefined
>;
const defaultDecoders: QuaggaJSReaders = ["code_128_reader"];

type ScannerProps = {
	onDetected: (result: QuaggaJSResultObject) => void;
	scannerRef: RefObject<HTMLDivElement | null>;
	onScannerReady: () => void;
	cameraId: string;
	facingMode: string;
	constraints?: MediaTrackConstraints;
	locator?: QuaggaJSConfigObject["locator"];
	readers?: QuaggaJSReaders;
	locate?: boolean;
};

function Scanner({
	onDetected,
	scannerRef,
	onScannerReady,
	cameraId,
	facingMode,
	constraints = defaultConstraints,
	locator = defaultLocatorSettings,
	readers = defaultDecoders,
	locate = true,
}: ScannerProps) {
	const errorCheck: QuaggaJSResultCallbackFunction = useCallback(
		(result) => {
			// const err = getMedianOfCodeErrors(result.codeResult.decodedCodes);
			// if Quagga is at least 75% certain that it read correctly, then accept the code.
			if (result.codeResult.code) {
				onDetected(result);
			}
		},
		[onDetected],
	);

	const handleProcessed = useCallback((result: QuaggaJSResultObject) => {
		const drawingCtx = Quagga.canvas.ctx.overlay;
		const drawingCanvas = Quagga.canvas.dom.overlay;

		const width = drawingCanvas?.getAttribute("width");
		const height = drawingCanvas?.getAttribute("height");

		if (!drawingCanvas || !drawingCtx) {
			console.error("Drawing canvas or context not found");
			return;
		}
		if (!width || !height) {
			console.error("Drawing canvas width or height not found");
			return;
		}

		drawingCtx.font = "24px Arial";
		drawingCtx.fillStyle = "green";

		if (result) {
			console.warn("* quagga onProcessed", result);
			if (result.boxes) {
				drawingCtx.clearRect(0, 0, parseInt(width, 10), parseInt(height, 10));
				result.boxes
					.filter((box) => box !== result.box)
					.forEach((box) => {
						Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, {
							color: "purple",
							lineWidth: 2,
						});
					});
			}
			if (result.box) {
				Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, {
					color: "blue",
					lineWidth: 2,
				});
			}
			const code = result.codeResult?.code;
			if (code) {
				console.log(code);
			}
		}
	}, []);

	useLayoutEffect(() => {
		// if this component gets unmounted in the same tick that it is mounted, then all hell breaks loose,
		// so we need to wait 1 tick before calling init().  I'm not sure how to fix that, if it's even possible,
		// given the asynchronous nature of the camera functions, the non asynchronous nature of React, and just how
		// awful browsers are at dealing with cameras.
		let ignoreStart = false;
		const init = async () => {
			// wait for one tick to see if we get unmounted before we can possibly even begin cleanup
			await new Promise((resolve) => setTimeout(resolve, 1));
			if (ignoreStart) {
				return;
			}
			// begin scanner initialization
			await Quagga.init(
				{
					inputStream: {
						type: "LiveStream",
						constraints: {
							...constraints,
							...(cameraId && { deviceId: cameraId }),
							...(!cameraId && { facingMode }),
						},
						target: scannerRef.current!,
						willReadFrequently: true,
						area: {
							top: "44%",
							right: "40%",
							bottom: "44%",
							left: "40%",
						},
					},
					decoder: { readers: readers },
					locate: false,

					locator: locator,
				},
				async (err) => {
					Quagga.onProcessed(handleProcessed);

					if (err) {
						return console.error("Error starting Quagga:", err);
					}
					if (scannerRef?.current) {
						Quagga.start();
						if (onScannerReady) {
							onScannerReady();
						}
					}
				},
			);
			Quagga.onDetected(errorCheck);
		};
		init();
		// cleanup by turning off the camera and any listeners
		return () => {
			ignoreStart = true;
			Quagga.stop();
			Quagga.offDetected(errorCheck);
			Quagga.offProcessed(handleProcessed);
		};
	}, [
		cameraId,
		onScannerReady,
		scannerRef,
		errorCheck,
		constraints,
		locator,
		readers,
		locate,
		facingMode,
		handleProcessed,
	]);
	return null;
}

export function BarcodeScanner() {
	const [scanning, setScanning] = useState(false); // toggleable state for "should render scanner"
	const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]); // array of available cameras, as returned by Quagga.CameraAccess.enumerateVideoDevices()
	const [cameraId, setCameraId] = useState<string | null>(null); // id of the active camera device
	const [cameraError, setCameraError] = useState(null); // error message from failing to access the camera
	const [results, setResults] = useState<QuaggaJSResultObject[]>([]); // list of scanned results
	const scannerRef = useRef<HTMLDivElement>(null); // reference to the scanner element in the DOM

	// at start, we need to get a list of the available cameras.  We can do that with Quagga.CameraAccess.enumerateVideoDevices.
	// HOWEVER, Android will not allow enumeration to occur unless the user has granted camera permissions to the app/page.
	// AS WELL, Android will not ask for permission until you actually try to USE the camera, just enumerating the devices is not enough to trigger the permission prompt.
	// THEREFORE, if we're going to be running in Android, we need to first call Quagga.CameraAccess.request() to trigger the permission prompt.
	// AND THEN, we need to call Quagga.CameraAccess.release() to release the camera so that it can be used by the scanner.
	// AND FINALLY, we can call Quagga.CameraAccess.enumerateVideoDevices() to get the list of cameras.

	// Normally, I would place this in an application level "initialization" event, but for this demo, I'm just going to put it in a useEffect() hook in the App component.

	useEffect(() => {
		const enableCamera = async () => {
			await Quagga.CameraAccess.request(null, {});
		};
		const disableCamera = () => {
			Quagga.CameraAccess.release();
		};

		const enumerateCameras = async () => {
			const cameras = await Quagga.CameraAccess.enumerateVideoDevices();
			setCameraId(cameras[0]?.deviceId);
			console.log("camera id:", cameras[0]?.deviceId);
			return cameras;
		};
		enableCamera()
			.then(disableCamera)
			.then(enumerateCameras)
			.then((cameras) => setCameras(cameras))
			.catch((err) => setCameraError(err));
		return () => disableCamera();
	}, []);

	return (
		<div>
			{cameraError ? (
				<p>
					ERROR INITIALIZING CAMERA ${JSON.stringify(cameraError)} -- DO YOU
					HAVE PERMISSION?
				</p>
			) : null}
			{cameras.length === 0 ? (
				<p>
					Enumerating Cameras, browser may be prompting for permissions
					beforehand
				</p>
			) : (
				<form>
					<select onChange={(event) => setCameraId(event.target.value)}>
						{cameras.map((camera) => (
							<option key={camera.deviceId} value={camera.deviceId}>
								{camera.label || camera.deviceId}
							</option>
						))}
					</select>
				</form>
			)}

			<Button onClick={() => setScanning(!scanning)}>
				{scanning ? "Stop" : "Start"}
			</Button>

			<ul className="results">
				{results.map((result) => (
					<li key={result.codeResult.code}>{result.codeResult.code}</li>
				))}
			</ul>
			<div ref={scannerRef} className="w-[1920px] h-[1080px] m-4 relative">
				<canvas
					className="drawingBuffer absolute inset-0"
					width="1920"
					height="1080"
				/>
				{scanning && cameraId ? (
					<Scanner
						scannerRef={scannerRef}
						cameraId={cameraId}
						onDetected={(result) => setResults([...results, result])}
						onScannerReady={() => console.log("scanner ready")}
						facingMode="environment"
					/>
				) : null}
			</div>
		</div>
	);
}
