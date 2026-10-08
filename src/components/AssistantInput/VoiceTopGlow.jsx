import {
    useEffect,
    useRef,
} from "react";


export default function VoiceTopGlow({
    active = false,
    stream = null,
    className = "",
}) {
    const ringRef =
        useRef(null);

    const audioContextRef =
        useRef(null);

    const analyserRef =
        useRef(null);

    const rafRef =
        useRef(0);

    const levelRef =
        useRef(0);


    useEffect(() => {
        if (
            !active ||
            !stream
        ) {
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

            analyserRef.current =
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
            0.7;

        const source =
            audioContext.createMediaStreamSource(
                stream,
            );

        source.connect(
            analyser,
        );


        audioContextRef.current =
            audioContext;

        analyserRef.current =
            analyser;


        return () => {
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

            analyserRef.current =
                null;
        };
    }, [
        active,
        stream,
    ]);


    useEffect(() => {
        const element =
            ringRef.current;

        if (!element) {
            return;
        }


        const tick = () => {
            const analyser =
                analyserRef.current;


            if (
                active &&
                analyser
            ) {
                const data =
                    new Uint8Array(
                        analyser.frequencyBinCount,
                    );

                analyser.getByteFrequencyData(
                    data,
                );


                const start =
                    Math.floor(
                        data.length *
                        0.05,
                    );

                const end =
                    Math.floor(
                        data.length *
                        0.55,
                    );


                let sum = 0;

                for (
                    let i = start;
                    i < end;
                    i += 1
                ) {
                    sum += data[i];
                }


                const raw =
                    sum /
                    Math.max(
                        1,
                        end - start,
                    ) /
                    255;


                const target =
                    Math.min(
                        1,
                        raw * 2.2,
                    );


                levelRef.current +=
                    (target -
                        levelRef.current) *
                    0.25;
            } else {
                levelRef.current +=
                    (0 -
                        levelRef.current) *
                    0.12;
            }


            const level =
                levelRef.current;


            const glow1 =
                12 +
                level * 14;

            const spread1 =
                2 +
                level * 4;

            const glow2 =
                26 +
                level * 26;

            const spread2 =
                6 +
                level * 10;


            element.style.opacity =
                String(
                    active
                        ? 0.6 +
                        level *
                        0.4
                        : 0,
                );


            element.style.boxShadow =
                `0 0 0 1.5px rgba(37, 99, 235, 0.95), ` +
                `0 0 ${glow1}px ${spread1}px rgba(37, 99, 235, 0.55), ` +
                `0 0 ${glow2}px ${spread2}px rgba(37, 99, 235, 0.28)`;


            rafRef.current =
                requestAnimationFrame(
                    tick,
                );
        };


        rafRef.current =
            requestAnimationFrame(
                tick,
            );


        return () => {
            cancelAnimationFrame(
                rafRef.current,
            );
        };
    }, [active]);


    return (
        <div
            className={`pointer-events-none absolute inset-0 ${className}`}
            aria-hidden="true"
        >
            <div
                ref={ringRef}
                className="absolute -inset-[1px] rounded-[25px] opacity-0 transition-opacity duration-200"
            />
        </div>
    );
}