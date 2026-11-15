const std = @import("std");
const html = @import("html");
const serial = @import("oneserial");

// A fresh bounded arena per call keeps browser memory and ownership explicit.
var input: [32768]u8 = undefined;
var heap: [16 * 1024 * 1024]u8 = undefined;
var arena = std.heap.FixedBufferAllocator.init(&heap);
var output: []const u8 = "";
const options: html.ParseOptions = .{ .non_destructive = true };
const Node = options.Node();
const Row = struct { index: u32, depth: u32, tag: []const u8, text: []const u8, matched: bool };
const Record = struct { id: u32, user: struct { name: []const u8, active: bool }, scores: []const u16 };
const Region = struct { name: []const u8, start: usize, end: usize };

export fn input_ptr() usize { return @intFromPtr(&input); }
export fn input_capacity() usize { return input.len; }
export fn output_ptr() usize { return @intFromPtr(output.ptr); }
export fn output_len() usize { return output.len; }

fn respond(value: anytype) !void {
    output = try std.json.Stringify.valueAlloc(arena.allocator(), value, .{ .emit_null_optional_fields = false });
}
fn parseHtml(bytes: []const u8) !void {
    const allocator = arena.allocator();
    const request = try std.json.parseFromSlice(struct { html: []const u8, selector: []const u8 }, allocator, bytes, .{});
    if (request.value.html.len > 8192 or request.value.selector.len > 256) return error.InputTooLarge;
    var doc = try options.parse(allocator, request.value.html);
    defer doc.deinit();
    if (doc.nodes.len > 1024) return error.TooManyNodes;
    const selector = try html.Selector.compileRuntime(allocator, request.value.selector);
    var matches = doc.queryRuntime(selector);
    defer matches.deinit();
    var selected: [1024]bool = @splat(false);
    var match_count: usize = 0;
    while (try matches.next()) |node| { selected[node.index] = true; match_count += 1; }
    var rows: std.ArrayList(Row) = .empty;
    // Walk the parser's actual node table; parents supply the indentation.
    for (doc.nodes, 0..) |_, index| {
        const node: Node = .{ .doc = &doc, .index = @intCast(index) };
        if (node.isDocument()) continue;
        var depth: u32 = 0;
        var parent = node.parentNode();
        while (parent) |p| : (parent = p.parentNode()) { if (!p.isDocument()) depth += 1; }
        const text = if (node.isText()) node.text() else "";
        try rows.append(allocator, .{ .index = @intCast(index), .depth = depth, .tag = if (node.isText()) "#text" else node.tagName(), .text = text, .matched = selected[index] });
    }
    try respond(.{ .nodes = rows.items, .matches = match_count, .sourceBytes = request.value.html.len });
}
fn packRecord(bytes: []const u8) !void {
    const allocator = arena.allocator();
    const request = try std.json.parseFromSlice(struct { value: Record, truncate: bool = false }, allocator, bytes, .{});
    if (request.value.value.user.name.len > 512 or request.value.value.scores.len > 128) return error.InputTooLarge;
    var wrapper = try serial.Wrapper(Record, .{}).init(&request.value.value, allocator);
    defer wrapper.deinit(allocator);
    const buffer = if (request.value.truncate) wrapper.memory[0 .. wrapper.memory.len - 1] else wrapper.memory;
    const byte_values = try allocator.alloc(u16, buffer.len);
    for (buffer, byte_values) |byte, *value| value.* = byte;
    const checked = serial.Untrusted(Record, .{}).init(buffer).validate() catch |err| {
        try respond(.{ .bytes = byte_values, .valid = false, .validation = @errorName(err) });
        return;
    };
    const id = checked.field("id");
    const user = checked.field("user");
    const name = user.field("name");
    const active = user.field("active");
    const scores = checked.field("scores");
    const decoded = try checked.toOwned(allocator);
    const regions = [_]Region{
        .{ .name = "id: u32", .start = id.start, .end = name.start },
        .{ .name = "user.name: length + UTF-8", .start = name.start, .end = active.start },
        .{ .name = "user.active: bool", .start = active.start, .end = scores.start },
        .{ .name = "scores: length + u16 values", .start = scores.start, .end = buffer.len },
    };
    try respond(.{ .bytes = byte_values, .valid = true, .decoded = decoded, .regions = regions, .validation = "Validated by OneSerial" });
}
export fn run(operation: u32, len: usize) void {
    arena.reset();
    output = "";
    if (len > input.len) { output = "{\"error\":\"InputTooLarge\"}"; return; }
    const result = if (operation == 0) parseHtml(input[0..len]) else packRecord(input[0..len]);
    result catch |err| { respond(.{ .@"error" = @errorName(err) }) catch { output = "{\"error\":\"OutOfMemory\"}"; }; };
}
