/**
 * scanLabels.ts — Filipino Context Labels for Plant Scanning
 * ─────────────────────────────────────────────────────────────────────────────
 * Adds subtle Filipino translations as secondary labels (not replacing English).
 * Keeps the UI primarily English but culturally relatable to Filipino users.
 */

export type CategoryType = "healthy" | "fungal" | "bacterial" | "viral" | "pest";

/** Severity / disease-style strings from PathoNet API (not the same as CategoryType). */
const SEVERITY_KEYS = new Set(["mild", "moderate", "severe", "low", "high", "critical"]);

export interface CategoryLabel {
  english: string;
  tagalog: string;
}

/**
 * Map raw `record.category` (from API or storage) to a UI bucket for colors/icons.
 * PathoNet often sets category to `severity` (e.g. "Moderate") instead of fungal/bacterial.
 */
export function normalizeScanCategory(raw: string | undefined | null): CategoryType {
  const k = (raw ?? "").toLowerCase().trim();
  if (k === "healthy" || k === "health") return "healthy";
  if (k === "fungal" || k === "bacterial" || k === "viral" || k === "pest") return k;
  if (!k || k === "unknown") return "fungal";
  if (SEVERITY_KEYS.has(k)) return "fungal";
  return "fungal";
}

export interface ConfidenceHint {
  english: string;
  tagalog: string;
}

/**
 * Get category label with English primary and Filipino translation.
 * Example: { english: "Healthy", tagalog: "malusog" }
 */
export const getCategoryWithTranslation = (
  category: string | CategoryType
): CategoryLabel => {
  const categories: Record<CategoryType, CategoryLabel> = {
    healthy: {
      english: "Healthy",
      tagalog: "malusog",
    },
    fungal: {
      english: "Fungal",
      tagalog: "may amag",
    },
    bacterial: {
      english: "Bacterial",
      tagalog: "may bakterya",
    },
    viral: {
      english: "Viral",
      tagalog: "may birus",
    },
    pest: {
      english: "Pest",
      tagalog: "may peste",
    },
  };

  const k = (category ?? "").toLowerCase().trim() as CategoryType;
  if (k in categories) return categories[k];

  const raw = String(category ?? "").trim();
  if (SEVERITY_KEYS.has((raw || "").toLowerCase())) {
    const cap = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    return {
      english: `Needs attention (${cap})`,
      tagalog: "kailangan pansinin",
    };
  }
  if (raw) {
    return {
      english: `Needs attention (${raw})`,
      tagalog: "hindi tiyak ang uri",
    };
  }
  return {
    english: "Uncertain",
    tagalog: "hindi tiyak",
  };
};

/**
 * Get confidence hint based on percentage.
 * Returns structured English + Tagalog label for display.
 */
export const getConfidenceHint = (confidence: number): ConfidenceHint => {
  const percentage = confidence * 100;

  if (percentage >= 90) {
    return {
      english: "Very confident",
      tagalog: "tiyak na tama",
    };
  } else if (percentage >= 75) {
    return {
      english: "Confident",
      tagalog: "mataas ang tiyansa",
    };
  } else if (percentage >= 60) {
    return {
      english: "Moderately confident",
      tagalog: "katamtaman",
    };
  } else if (percentage >= 40) {
    return {
      english: "Low confidence",
      tagalog: "mababa ang tiyansa",
    };
  } else {
    return {
      english: "Very uncertain",
      tagalog: "hindi sigurado",
    };
  }
};

/**
 * Format confidence with percentage and hint.
 * Example: "92% confidence (tiyak na tama)"
 */
export const formatConfidenceText = (confidence: number): string => {
  const percentage = Math.round(confidence * 100);
  const hint = getConfidenceHint(confidence);
  return `${percentage}% confidence`;
};

/**
 * Get confidence hint hint only (Tagalog in parens).
 * Example: "(tiyak na tama)"
 */
export const getConfidenceHintText = (confidence: number): string => {
  const hint = getConfidenceHint(confidence);
  return `(${hint.tagalog})`;
};

/**
 * Get disease names with brief Tagalog context.
 * Useful for quick reference or tooltips.
 */
export const getDiseaseContext = (
  category: CategoryType
): Record<string, string> => {
  const contexts: Record<CategoryType, Record<string, string>> = {
    healthy: {
      icon: "🌱",
      context: "Plant is in good condition",
      tagalogContext: "Ang halaman ay nasa magandang kalagayan",
    },
    fungal: {
      icon: "🍄",
      context: "Fungal infection detected",
      tagalogContext: "May amag na napansin",
    },
    bacterial: {
      icon: "🦠",
      context: "Bacterial infection detected",
      tagalogContext: "May sakit na nabatid",
    },
    viral: {
      icon: "🦟",
      context: "Viral infection detected",
      tagalogContext: "May birus na nakita",
    },
    pest: {
      icon: "🐛",
      context: "Pest infestation detected",
      tagalogContext: "May imburnal na napansin",
    },
  };

  return contexts[category] || contexts.healthy;
};
