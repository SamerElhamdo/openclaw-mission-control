import { gatewaysStatusApiV1GatewaysStatusGet } from "@/api/generated/gateways/gateways";

export const DEFAULT_WORKSPACE_ROOT = "~/.openclaw";

export type GatewayCheckStatus = "idle" | "checking" | "success" | "error";

/**
 * Returns true only when the URL string contains an explicit ":port" segment.
 *
 * JavaScript's URL API sets `.port` to "" for *both* an omitted port and a
 * port that equals the scheme's default (e.g. 443 for wss:). We therefore
 * inspect the raw host+port token from the URL string instead.
 */
function hasExplicitPort(urlString: string): boolean {
  try {
    // Extract the authority portion (between // and the first / ? or #)
    const withoutScheme = urlString.slice(urlString.indexOf("//") + 2);
    const authority = withoutScheme.split(/[/?#]/)[0];
    if (!authority) {
      return false;
    }

    // authority may be:
    // - host[:port]
    // - [ipv6][:port]
    // - userinfo@host[:port]
    // - userinfo@[ipv6][:port]
    const atIndex = authority.lastIndexOf("@");
    const hostPort = atIndex === -1 ? authority : authority.slice(atIndex + 1);

    let portSegment = "";
    if (hostPort.startsWith("[")) {
      const closingBracketIndex = hostPort.indexOf("]");
      if (closingBracketIndex === -1) {
        return false;
      }
      portSegment = hostPort.slice(closingBracketIndex + 1);
    } else {
      const lastColonIndex = hostPort.lastIndexOf(":");
      if (lastColonIndex === -1) {
        return false;
      }
      portSegment = hostPort.slice(lastColonIndex);
    }

    if (!portSegment.startsWith(":") || !/^:\d+$/.test(portSegment)) {
      return false;
    }

    const port = Number.parseInt(portSegment.slice(1), 10);
    return Number.isInteger(port) && port >= 0 && port <= 65535;
  } catch {
    return false;
  }
}

/**
 * Returns error if the URL has a port-like segment that is out of range.
 * hasExplicitPort returns false for both "no port" and "invalid port".
 */
function getInvalidPortError(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    if (!url.port) return null;
    const port = Number.parseInt(url.port, 10);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      return "Enter a valid gateway URL.";
    }
  } catch {
    return null;
  }
  return null;
}

export const validateGatewayUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "Gateway URL is required.";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "ws:" && url.protocol !== "wss:") {
      return "Gateway URL must start with ws:// or wss://.";
    }
    const invalidPortErr = getInvalidPortError(trimmed);
    if (invalidPortErr) return invalidPortErr;
    // Explicit port required only when URL has userinfo (user:pass@host) to avoid
    // ambiguity. Plain ws://host and wss://host use default ports 80/443.
    if (!hasExplicitPort(trimmed)) {
      const withoutScheme = trimmed.slice(trimmed.indexOf("//") + 2);
      const authority = withoutScheme.split(/[/?#]/)[0] ?? "";
      if (authority.includes("@")) {
        return "Gateway URL with userinfo must include an explicit port.";
      }
    }
    return null;
  } catch {
    return "Enter a valid gateway URL.";
  }
};

export async function checkGatewayConnection(params: {
  gatewayUrl: string;
  gatewayToken: string;
  gatewayDisableDevicePairing: boolean;
  gatewayAllowInsecureTls: boolean;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const requestParams: {
      gateway_url: string;
      gateway_token?: string;
      gateway_disable_device_pairing: boolean;
      gateway_allow_insecure_tls: boolean;
    } = {
      gateway_url: params.gatewayUrl.trim(),
      gateway_disable_device_pairing: params.gatewayDisableDevicePairing,
      gateway_allow_insecure_tls: params.gatewayAllowInsecureTls,
    };
    if (params.gatewayToken.trim()) {
      requestParams.gateway_token = params.gatewayToken.trim();
    }

    const response = await gatewaysStatusApiV1GatewaysStatusGet(requestParams);
    if (response.status !== 200) {
      return { ok: false, message: "Unable to reach gateway." };
    }
    const data = response.data;
    if (!data.connected) {
      return { ok: false, message: data.error ?? "Unable to reach gateway." };
    }
    return { ok: true, message: "Gateway reachable." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Unable to reach gateway.",
    };
  }
}
