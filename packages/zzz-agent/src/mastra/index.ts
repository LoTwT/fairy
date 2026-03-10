import { Mastra } from "@mastra/core/mastra"
import { LibSQLStore } from "@mastra/libsql"
import { PinoLogger } from "@mastra/loggers"
import {
  CloudExporter,
  DefaultExporter,
  Observability,
  SensitiveDataFilter,
} from "@mastra/observability"
import { zzzAgent } from "./agents/zzz-agent"
import {
  completenessScorer,
  multiplierAccuracyScorer,
  outputFormatScorer,
} from "./scorers/zzz-scorer"

export const mastra = new Mastra({
  agents: { zzzAgent },
  scorers: {
    completenessScorer,
    outputFormatScorer,
    multiplierAccuracyScorer,
  },
  storage: new LibSQLStore({
    id: "mastra-storage",
    url: "file:./mastra.db",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [new DefaultExporter(), new CloudExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
})
