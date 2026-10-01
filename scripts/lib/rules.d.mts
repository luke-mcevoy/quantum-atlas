export declare const HYPE: RegExp;
export declare const ATTRIBUTION: RegExp;
export declare function norm(s: string): string;
export declare function hypeProblems(text: string | undefined, quotes: string[]): string[];
export declare function proseNumbers(s: string): string[];
export declare const PEER_RANK: Record<"company_claim" | "preprint" | "peer_reviewed", number>;
export declare function impliedPeerReview(docTypes: (string | undefined)[]): "peer_reviewed" | "preprint" | "company_claim";
