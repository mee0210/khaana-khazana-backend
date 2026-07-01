/**
 * OpenTelemetry Tracing Initialization
 *
 * This module sets up distributed tracing for our microservice. It initializes the
 * OpenTelemetry Node SDK, registers auto-instrumentations (for Express, HTTP, and pg database client),
 * and configures the OTLP/gRPC exporter to forward trace spans to Jaeger (or any OTLP collector).
 *
 * IMPORTANT: This module must be imported at the very top of your entrypoint (server.js)
 * before any other packages are required, so that it can hook into core Node and third-party
 * packages to auto-instrument them.
 */
const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-proto");
// Only initialize OpenTelemetry if we are not running tests, or if explicitly enabled
if (
  process.env.NODE_ENV !== "test" &&
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT
) {
  console.log("Initializing OpenTelemetry Tracing...");
  const sdk = new NodeSDK({
    // Configure trace exporter to send spans to Jaeger OTLP/gRPC or OTLP/HTTP endpoint
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4317",
    }),
    // Auto-instrument express, pg, http, etc.
    instrumentations: [getNodeAutoInstrumentations()],
  });
  // Start tracing SDK
  sdk.start();
  console.log("OpenTelemetry Tracing started successfully.");
  // Ensure graceful shutdown of the exporter on process termination
  process.on("SIGTERM", () => {
    sdk
      .shutdown()
      .then(() => console.log("OpenTelemetry tracing successfully shut down."))
      .catch((err) =>
        console.error("Error shutting down OpenTelemetry tracing:", err),
      )
      .finally(() => process.exit(0));
  });
} else {
  console.log(
    "OpenTelemetry tracing is disabled (OTEL_EXPORTER_OTLP_ENDPOINT not set or running tests).",
  );
}
