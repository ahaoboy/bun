import { bunExe } from "bun:harness";
import { bunEnv, tmpdirSync } from "harness";
import { createTest } from "node-harness";
const { describe, expect, it } = createTest(import.meta.path);
import * as path from "node:path";

it.skipIf(!bunEnv.TEST_INFO_AZURE_SERVICE_BUS)("works", async () => {
  const package_dir = tmpdirSync("bun-test-");

  let { stdout, stderr, exited } = Bun.spawn({
    cmd: [bunExe(), "add", "@azure/service-bus@7.9.4"],
    cwd: package_dir,
    stdout: "pipe",
    stdin: "ignore",
    stderr: "pipe",
    env: bunEnv,
  });
  let err = await new Response(stderr).text();
  expect(err).not.toContain("panic:");
  expect(err).not.toContain("error:");
  expect(err).not.toContain("warn:");
  let out = await new Response(stdout).text();
  await exited;

  const fixture_path = path.join(package_dir, "index.ts");
  const fixture_data = String.raw`
    import { ServiceBusClient } from "@azure/service-bus";

    const connectionString = "${bunEnv.TEST_INFO_AZURE_SERVICE_BUS}";
    const sbClient = new ServiceBusClient(connectionString);
    const sender = sbClient.createSender("test");
    
    try {
      await sender.sendMessages({ body: "Hello, world!" });
      console.log("Message sent");
      await sender.close();
    } finally {
      await sbClient.close();
    }
  `;
  await Bun.write(fixture_path, fixture_data);

  ({ stdout, stderr } = Bun.spawn({
    cmd: [bunExe(), "run", fixture_path],
    cwd: package_dir,
    stdout: "pipe",
    stdin: "ignore",
    stderr: "pipe",
    env: bunEnv,
  }));
  err = await new Response(stderr).text();
  expect(err).toBeEmpty();
  out = await new Response(stdout).text();
  expect(out).toEqual("Message sent\n");
});