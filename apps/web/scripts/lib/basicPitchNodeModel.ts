/**
 * basicPitchNodeModel - basic-pitch の TFJS モデルを Node から読み込む
 *
 * ブラウザでは vite-plugin-static-copy が配信する /models/basic-pitch/model.json を
 * BasicPitch が fetch するが、Node には相対 URL の fetch も file:// の fetch もない。
 * ここでは @spotify/basic-pitch に同梱されたモデル (node_modules 内) を fs で読み、
 * tf.io.IOHandler としてそのまま tf.loadGraphModel に渡す。
 *
 * オフライン評価専用。アプリのバンドルには含まれない
 * (apps/web/scripts は tsconfig.scripts.json 側でのみ型検査する)。
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

import * as tf from "@tensorflow/tfjs";
import type { GraphModel } from "@tensorflow/tfjs";

const require = createRequire(import.meta.url);

/** @spotify/basic-pitch に同梱されたモデルディレクトリを解決する */
function resolveModelDir(): string {
    const pkgJson = require.resolve("@spotify/basic-pitch/package.json");
    const modelDir = path.join(path.dirname(pkgJson), "model");
    if (!fs.existsSync(path.join(modelDir, "model.json"))) {
        throw new Error(`basic-pitch のモデルが見つからない: ${modelDir}`);
    }
    return modelDir;
}

/**
 * model.json と重みシャードをローカルから読み、ModelArtifacts を返す IOHandler。
 * weightsManifest の各グループの paths を宣言順に連結したものが重み本体になる
 */
function fileSystemIoHandler(modelDir: string): tf.io.IOHandler {
    return {
        load: async (): Promise<tf.io.ModelArtifacts> => {
            const manifest = JSON.parse(
                fs.readFileSync(path.join(modelDir, "model.json"), "utf8")
            ) as {
                modelTopology: unknown;
                weightsManifest: {
                    paths: string[];
                    weights: tf.io.WeightsManifestEntry[];
                }[];
                format?: string;
                generatedBy?: string;
                convertedBy?: string;
                signature?: unknown;
                userDefinedMetadata?: tf.io.ModelArtifacts["userDefinedMetadata"];
            };

            const weightSpecs: tf.io.WeightsManifestEntry[] = [];
            const shards: Buffer[] = [];
            for (const group of manifest.weightsManifest) {
                for (const shardPath of group.paths) {
                    shards.push(fs.readFileSync(path.join(modelDir, shardPath)));
                }
                weightSpecs.push(...group.weights);
            }
            const merged = Buffer.concat(shards);
            const weightData = merged.buffer.slice(
                merged.byteOffset,
                merged.byteOffset + merged.byteLength
            );

            return {
                modelTopology: manifest.modelTopology as tf.io.ModelArtifacts["modelTopology"],
                weightSpecs,
                weightData,
                format: manifest.format,
                generatedBy: manifest.generatedBy,
                convertedBy: manifest.convertedBy,
                signature: manifest.signature as tf.io.ModelArtifacts["signature"],
                userDefinedMetadata: manifest.userDefinedMetadata,
            };
        },
    };
}

let modelPromise: Promise<GraphModel> | null = null;

/**
 * Node 用に basic-pitch のモデルを読み込む (プロセス内でシングルトン)。
 * TFJS のバックエンドは CPU を明示的に選ぶ (WebGL は Node で使えない)
 */
export function loadBasicPitchModelForNode(): Promise<GraphModel> {
    if (!modelPromise) {
        modelPromise = (async () => {
            await tf.setBackend("cpu");
            await tf.ready();
            return tf.loadGraphModel(fileSystemIoHandler(resolveModelDir()));
        })().catch((err: unknown) => {
            modelPromise = null;
            throw err;
        });
    }
    return modelPromise;
}
