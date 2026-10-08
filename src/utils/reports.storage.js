import {
    initialReports,
} from "../mocks/reports.mock";

const STORAGE_KEY =
    "hackathon_reports";

export function getStoredReports() {
    try {
        const raw =
            localStorage.getItem(
                STORAGE_KEY,
            );

        if (!raw) {
            return initialReports;
        }

        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed
            : initialReports;
    } catch {
        return initialReports;
    }
}

export function saveReports(
    reports,
) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(reports),
    );
}

export function createReport(
    input,
) {
    const current =
        getStoredReports();

    const maxId =
        current.length > 0
            ? Math.max(
                ...current.map(
                    (item) =>
                        Number(item.id),
                ),
            )
            : 0;

    const report = {
        id: maxId + 1,

        type: input.type,

        title: input.title,

        periodLabel:
            input.periodLabel,

        areaLabel:
            input.areaLabel,

        format:
            input.format,

        createdBy:
            "Иванов Алексей",

        createdAt:
            new Date().toISOString(),

        status: "READY",

        size:
            input.format === "PDF"
                ? "1.1 МБ"
                : "640 КБ",
    };

    const next = [
        report,
        ...current,
    ];

    saveReports(next);

    return report;
}