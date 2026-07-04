#!/bin/bash
sed -i '27i import { experimentRunner } from "./server/experimentRunner.ts";' server.ts
sed -i '/await ingestionEngine.start();/a \    experimentRunner.start();' server.ts
