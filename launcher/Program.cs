// Program.cs
using System;
using System.Diagnostics;
using System.IO;
using System.Collections.Generic;
using System.Linq;

namespace LauncherApp
{
    class Program
    {
        static int Main(string[] args)
        {
            try
            {
                if (args == null || args.Length == 0)
                {
                    Console.Error.WriteLine("No URL passed to launcher.");
                    return 2;
                }

                // Example arg: myapp://run?script=scanrange&range=192.168.1.1-192.168.1.254
                string raw = args[0];

                Uri uri;
                try
                {
                    uri = new Uri(raw);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine("Invalid URI: " + ex.Message);
                    return 3;
                }

                // get query string without leading '?'
                string query = uri.Query?.TrimStart('?') ?? string.Empty;

                // parse query into dictionary (key => value)
                var queryDict = query
                    .Split(new[] { '&' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(p => p.Split(new[] { '=' }, 2))
                    .Where(parts => parts.Length == 2)
                    .ToDictionary(
                        parts => Uri.UnescapeDataString(parts[0]),
                        parts => Uri.UnescapeDataString(parts[1]),
                        StringComparer.OrdinalIgnoreCase
                    );

                // required param: script
                if (!queryDict.TryGetValue("script", out string scriptKey) || string.IsNullOrWhiteSpace(scriptKey))
                {
                    Console.Error.WriteLine("No script specified in the URL (expected 'script' query param).");
                    return 4;
                }

                // BASE PATH (project root requested)
                string basePath = @"E:\ShareME\SBAC TAO\NewYear25\pc-inventory";

                // WHITELIST: map script keys to absolute script files (only these allowed)
                var allowed = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                {
                    { "scanrange", Path.Combine(basePath, "scripts", "scanrange.ps1") },
                    { "cleanup",   Path.Combine(basePath, "scripts", "cleanup.ps1") }
                };

                if (!allowed.ContainsKey(scriptKey))
                {
                    Console.Error.WriteLine($"Unauthorized script key: {scriptKey}");
                    return 5;
                }

                string scriptPath = allowed[scriptKey];
                if (!File.Exists(scriptPath))
                {
                    Console.Error.WriteLine($"Script not found: {scriptPath}");
                    return 6;
                }

                // optional additional argument (e.g. range parameter)
                string extraArgs = string.Empty;
                if (queryDict.TryGetValue("range", out string rangeVal) && !string.IsNullOrWhiteSpace(rangeVal))
                {
                    // basic sanitization - allow digits, dots, hyphen and slash only
                    if (rangeVal.All(c => char.IsDigit(c) || c == '.' || c == '-' || c == '/'))
                    {
                        extraArgs = $" -Range \"{rangeVal}\"";
                    }
                    else
                    {
                        Console.Error.WriteLine("Invalid characters in range parameter.");
                        return 7;
                    }
                }

                // Build PowerShell arguments
                string arguments = $"-NoProfile -ExecutionPolicy Bypass -File \"{scriptPath}\"{extraArgs}";

                var psi = new ProcessStartInfo("powershell.exe")
                {
                    Arguments = arguments,
                    UseShellExecute = true,
                    Verb = "runas" // triggers UAC elevation
                };

                Process.Start(psi);
                return 0;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("Unhandled exception: " + ex.ToString());
                return 99;
            }
        }
    }
}
