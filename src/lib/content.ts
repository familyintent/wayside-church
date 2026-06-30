import { parse } from "yaml";
import settingsYaml from "../content/settings.yaml?raw";

export const site = parse(settingsYaml);
