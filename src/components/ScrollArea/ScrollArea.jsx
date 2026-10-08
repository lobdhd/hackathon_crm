import {
    useEffect,
    useRef,
    useState,
} from "react";

import "./ScrollArea.css";

export default function ScrollArea({
    children,
    className = "",
    style,
    axis = "y",
    hideDelay = 650,
}) {
    const [
        isScrolling,
        setIsScrolling,
    ] = useState(false);

    const timerRef =
        useRef(null);

    function handleScroll() {
        setIsScrolling(true);

        if (
            timerRef.current
        ) {
            clearTimeout(
                timerRef.current,
            );
        }

        timerRef.current =
            setTimeout(() => {
                setIsScrolling(
                    false,
                );
            }, hideDelay);
    }

    useEffect(() => {
        return () => {
            if (
                timerRef.current
            ) {
                clearTimeout(
                    timerRef.current,
                );
            }
        };
    }, []);

    return (
        <div
            className={[
                "app-scroll",
                `app-scroll--${axis}`,

                isScrolling
                    ? "app-scroll--scrolling"
                    : "",

                className,
            ]
                .filter(Boolean)
                .join(" ")}
            style={style}
            onScroll={
                handleScroll
            }
        >
            {children}
        </div>
    );
}