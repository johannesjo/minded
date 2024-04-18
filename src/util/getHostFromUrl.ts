import { fromUrl, parseDomain, ParseResultType } from "parse-domain";

export const getHostFromUrl = (url: string): string => {
  const parsedHost = parseDomain(fromUrl(url));
  if (parsedHost.type === ParseResultType.Listed) {
    return (
      parsedHost.icann.domain + "." + parsedHost.icann.topLevelDomains.join(".")
    );
  }
  if (
    parsedHost.type === ParseResultType.Ip ||
    parsedHost.hostname === "localhost"
  ) {
    return parsedHost.hostname as string;
  }
  console.log("Url could not be parsed", parsedHost);
  return url.replace("http://", "").replace("https://", "");
};
