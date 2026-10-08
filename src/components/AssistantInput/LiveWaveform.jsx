import {
    useEffect,
    useRef,
} from "react";


export default function LiveWaveform({
    active = false,
    processing = false,
    stream = null,

    height = 32,

    barWidth = 3,
    barGap = 2,
    barRadius = 2,

    sensitivity = 1.7,

    className = "",
}) {
    const canvasRef =
        useRef(null);

    const analyserRef =
        useRef(null);

    const audioContextRef =
        useRef(null);

    const rafRef =
        useRef(null);


    useEffect(() => {
        if (
            !active ||
            !stream
        ) {
            analyserRef.current =
                null;

            if (
                audioContextRef.current &&
                audioContextRef.current
                    .state !==
                "closed"
            ) {
                audioContextRef.current
                    .close()
                    .catch(() => { });
            }

            audioContextRef.current =
                null;

            return;
        }


        const AudioContextCtor =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextCtor) {
            return;
        }


        const audioContext =
            new AudioContextCtor();

        const analyser =
            audioContext.createAnalyser();

        analyser.fftSize =
            256;

        analyser.smoothingTimeConstant =
            0.78;


        const source =
            audioContext.createMediaStreamSource(
                stream,
            );

        source.connect(
            analyser,
        );


        analyserRef.current =
            analyser;

        audioContextRef.current =
            audioContext;


        return () => {
            analyserRef.current =
                null;

            try {
                if (
                    audioContext.state !==
                    "closed"
                ) {
                    audioContext.close();
                }
            } catch {
                // noop
            }

            audioContextRef.current =
                null;
        };
    }, [
        active,
        stream,
    ]);


    useEffect(() => {
        const canvas =
            canvasRef.current;

        if (!canvas) {
            return;
        }


        const resize = () => {
            const rect =
                canvas.getBoundingClientRect();

            const dpr =
                window.devicePixelRatio ||
                1;


            canvas.width =
                Math.max(
                    1,
                    Math.floor(
                        rect.width *
                        dpr,
                    ),
                );

            canvas.height =
                Math.max(
                    1,
                    Math.floor(
                        rect.height *
                        dpr,
                    ),
                );
        };


        resize();


        const observer =
            new ResizeObserver(
                resize,
            );

        observer.observe(
            canvas,
        );


        return () => {
            observer.disconnect();
        };
    }, []);


    useEffect(() => {
        const canvas =
            canvasRef.current;

        if (!canvas) {
            return;
        }


        const context =
            canvas.getContext(
                "2d",
            );

        if (!context) {
            return;
        }


        const drawRoundedBar = (
            x,
            y,
            width,
            barHeight,
        ) => {
            const radius =
                Math.min(
                    barRadius,
                    width / 2,
                    barHeight / 2,
                );


            context.beginPath();

            context.roundRect(
                x,
                y,
                width,
                barHeight,
                radius,
            );

            context.fill();
        };


        const animate = (
            time,
        ) => {
            const rect =
                canvas.getBoundingClientRect();

            const dpr =
                window.devicePixelRatio ||
                1;

            const width =
                rect.width;

            const canvasHeight =
                rect.height;


            context.setTransform(
                dpr,
                0,
                0,
                dpr,
                0,
                0,
            );

            context.clearRect(
                0,
                0,
                width,
                canvasHeight,
            );


            const barCount =
                Math.max(
                    5,
                    Math.floor(
                        width /
                        (barWidth +
                            barGap),
                    ),
                );


            const center =
                (barCount - 1) /
                2;


            let frequencyData =
                null;


            if (
                active &&
                analyserRef.current
            ) {
                frequencyData =
                    new Uint8Array(
                        analyserRef.current
                            .frequencyBinCount,
                    );

                analyserRef.current.getByteFrequencyData(
                    frequencyData,
                );
            }


            context.fillStyle =
                "rgb(37 99 235)";


            for (
                let index = 0;
                index < barCount;
                index += 1
            ) {
                let normalized =
                    0.08;


                if (
                    active &&
                    frequencyData
                ) {
                    const distance =
                        Math.abs(
                            index -
                            center,
                        );

                    const position =
                        1 -
                        distance /
                        Math.max(
                            center,
                            1,
                        );


                    const usableLength =
                        Math.floor(
                            frequencyData.length *
                            0.42,
                        );


                    const dataIndex =
                        Math.min(
                            usableLength -
                            1,
                            Math.max(
                                0,
                                Math.floor(
                                    position *
                                    usableLength,
                                ),
                            ),
                        );


                    normalized =
                        Math.min(
                            1,
                            (frequencyData[
                                dataIndex
                            ] /
                                255) *
                            sensitivity,
                        );


                    normalized =
                        Math.max(
                            0.08,
                            normalized,
                        );
                } else if (
                    processing
                ) {
                    normalized =
                        0.18 +
                        Math.abs(
                            Math.sin(
                                time /
                                240 +
                                index *
                                0.45,
                            ),
                        ) *
                        0.45;
                }


                const minimum =
                    4;

                const maximum =
                    Math.max(
                        minimum,
                        canvasHeight -
                        4,
                    );


                const currentHeight =
                    minimum +
                    normalized *
                    (maximum -
                        minimum);


                const x =
                    index *
                    (barWidth +
                        barGap);

                const y =
                    (canvasHeight -
                        currentHeight) /
                    2;


                drawRoundedBar(
                    x,
                    y,
                    barWidth,
                    currentHeight,
                );
            }


            rafRef.current =
                requestAnimationFrame(
                    animate,
                );
        };


        rafRef.current =
            requestAnimationFrame(
                animate,
            );


        return () => {
            if (
                rafRef.current
            ) {
                cancelAnimationFrame(
                    rafRef.current,
                );
            }
        };
    }, [
        active,
        processing,
        barWidth,
        barGap,
        barRadius,
        sensitivity,
    ]);


    return (
        <canvas
            ref={canvasRef}
            className={`block h-full w-full ${className}`}
            style={{
                height:
                    typeof height ===
                        "number"
                        ? `${height}px`
                        : height,
            }}
            aria-hidden="true"
        />
    );
}