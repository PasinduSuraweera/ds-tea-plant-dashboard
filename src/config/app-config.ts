import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Tea Plantation Management System",
  version: packageJson.version,
  copyright: `© ${currentYear}, Tea Plantation Management System.`,
  meta: {
    title: "Tea Plantation Management System - Comprehensive Dashboard",
    description:
      "A comprehensive tea plantation management system built with Next.js 16, Tailwind CSS v4, and shadcn/ui. Manage plantations, workers, harvest tracking, quality control, and inventory efficiently.",
  },
};
