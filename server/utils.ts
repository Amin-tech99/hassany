import { exec } from "child_process";
import { promisify } from "util";

// Promisify exec for async/await usage
export const execAsync = promisify(exec); 