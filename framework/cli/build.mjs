import * as path from "node:path";

import webpack from "webpack";
// @ts-expect-error
import { formatMessages } from "webpack-format-messages";

import { getWebpackConfig } from "framework/webpack";

export async function build() {
	const cwd = process.cwd();
	const mode =
		process.env.NODE_ENV === "development" ? "development" : "production";

	const clientModules = new Set();
	const serverModules = new Set();
	console.log("🧩 building server bundle...");
	await runWebpack(
		await getWebpackConfig("server", {
			clientModules,
			cwd,
			mode,
			serverModules,
		}),
	);

	const clientModulesArray = Array.from(clientModules);
	console.log(`\nℹ client modules in container: ${clientModulesArray.length}`);
	if (process.env.DEBUG) {
		for (const clientModule of clientModules) {
			console.log(`  - file://${path.relative(cwd, clientModule)}`);
		}
	}
	console.log();

	console.log("🧩 building ssr bundle...");
	console.log("🧩 building browser bundle...");
	console.log();
	await Promise.all([
		runWebpack(
			await getWebpackConfig("ssr", {
				clientModules,
				cwd,
				mode,
				serverModules,
			}),
		),
		runWebpack(
			await getWebpackConfig("browser", {
				clientModules,
				cwd,
				mode,
				serverModules,
			}),
		),
	]);
	console.log();
}

/**
 * @param {webpack.Configuration & { name: "server" | "ssr" | "browser" }} config
 * @returns
 */
function runWebpack(config) {
	console.time(`🎉 built ${config.name} bundle in`);
	const endTimer = startTimer();
	return new Promise((resolve, reject) => {
		webpack(config, (err, stats) => {
			if (err) {
				return reject(err);
			}
			if (!stats) {
				return reject(new Error("no stats returned from webpack"));
			}
			const messages = formatMessages(stats);

			const errorsOrWarnings =
				!!messages.errors.length || !!messages.warnings.length;

			if (errorsOrWarnings) console.log("\n\n");
			if (messages.errors.length) {
				for (const e of messages.errors) {
					console.log(e);
				}
				console.log("\n\n");
				return reject(new Error(`${config.name} build failed`));
			}

			if (messages.warnings.length) {
				for (const e of messages.warnings) {
					console.log(e);
				}
			}
			if (errorsOrWarnings) console.log("\n\n");
			resolve(stats);
		});
	})
		.then((stats) => {
			endTimer(`🎉 built ${config.name} bundle in`);
			return stats;
		})
		.catch((err) => {
			endTimer(`❌ built ${config.name} bundle in`);
			throw err;
		});
}

function startTimer() {
	const start = process.hrtime.bigint();
	/**
	 * @param {string} msg
	 */
	return (msg) => {
		const end = process.hrtime.bigint();
		console.log(`${msg} ${(end - start) / 1000000n}ms`);
	};
}
