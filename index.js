require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits, PermissionsBitField, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// File to store persistent settings
const DATA_FILE = './guildSettings.json';

// Load or initialize settings
let data = { guilds: {} };
if (fs.existsSync(DATA_FILE)) {
    try { data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } 
    catch (e) { console.error('Error reading guild settings file:', e); }
}

// Save settings
function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Noise pattern for regex
const noise = '[\\p{P}\\p{S}\\p{Z}\\s~_^\\-=*]*?';

// Char maps for strictness levels 0–5 (expandable)
const charMaps = [
  {}, // 0 exact match
  {
    // Level 1
    a: "[aA4]+",
    b: "[bB8]+",
    c: "[cC]+",
    d: "[dD]+",
    e: "[eE3]+",
    f: "[fF]+",
    g: "[gG6]+",
    h: "[hH]+",
    i: "[iI1]+",
    j: "[jJ]+",
    k: "[kK]+",
    l: "[lL1]+",
    m: "[mM]+",
    n: "[nN]+",
    o: "[oO0]+",
    p: "[pP]+",
    q: "[qQ9]+",
    r: "[rR]+",
    s: "[sS5]+",
    t: "[tT7]+",
    u: "[uU]+",
    v: "[vV]+",
    w: "[wW]+",
    x: "[xX]+",
    y: "[yY]+",
    z: "[zZ2]+"
  },
  {
    // Level 2
    a: "[aA4]+",
    b: "[bB8]+",
    c: "[cC]+",
    d: "[dD]+",
    e: "[eE3]+",
    f: "[fF]+|ph",
    g: "[gG6]+",
    h: "[hH]+",
    i: "[iI1]+",
    j: "[jJ]+",
    k: "[kK]+",
    l: "[lL1]+",
    m: "[mM]+",
    n: "[nN]+",
    o: "[oO0]+",
    p: "[pP]+",
    q: "[qQ9]+",
    r: "[rR]+",
    s: "[sS5]+",
    t: "[tT7]+",
    u: "[uU]+",
    v: "[vV]+",
    w: "[wW]+",
    x: "[xX]+",
    y: "[yY]+",
    z: "[zZ2]+"
  },
  {
    // Level 3
    a: "[aA@4]+|\\(\\)|\\{\\}|\\[\\]|<>",
    b: "[bB8]+|13|\\|3",
    c: "[cC]+|\\(+|\\[+|\\{+|<+",
    d: "[dD]+|\\|\\)+",
    e: "[eE3]+",
    f: "[fF]+|ph",
    g: "[gG69]+",
    h: "[hH]+|#",
    i: "[iI1!]+",
    j: "[jJ]+",
    k: "[kK]+|\\|<|\\|\\(",
    l: "[lL1|!]+|\\|+",
    m: "[mM]+|/\\\\/\\\\|nn",
    n: "[nN]+|/\\\\/|\\|\\|",
    o: "[oO0]+|\\(\\)|\\[\\]|\\{\\}|<>",
    p: "[pP]+|\\|\\*",
    q: "[qQ9]+",
    r: "[rR]+|\\|2",
    s: "[sS5]+|z|2",
    t: "[tT7]+|\\+|7",
    u: "[uU]+|\\(\\)|\\|_\\|",
    v: "[vV]+|\\\\/|\\|/",
    w: "[wW]+|\\\\/\\\\/|vv",
    x: "[xX]+|%|><",
    y: "[yY]+",
    z: "[zZ2]+|s|5"
  },
  {
    // Level 4
    a: "[aA@4àáâäæãåα🅰️]+|/\\\\|\\(\\)|\\{\\}|\\[\\]|<>",
    b: "[bB8ß🅱️]+|13|\\|3",
    c: "[cCç¢🅲]+|\\(+|\\[+|\\{+|<+",
    d: "[dD🅳]+|\\|\\)+",
    e: "[eE3èéêë€🅴]+",
    f: "[fFƒ🅵]+|ph",
    g: "[gG69🅶]+",
    h: "[hH#🅷]+",
    i: "[iI1!|íìîï🅸]+",
    j: "[jJ🅹]+",
    k: "[kKκ🅺]+|\\|<|\\|\\(",
    l: "[lL1|!🅻]+|\\|+",
    m: "[mM🅼]+|/\\\\/\\\\|nn",
    n: "[nNñ🅽]+|/\\\\/|\\|\\|",
    o: "[oO0°🅾️]+|\\(\\)|\\[\\]|\\{\\}|<>",
    p: "[pPρ🅿️]+|\\|\\*",
    q: "[qQ🆀]+|9",
    r: "[rR🆁]+|\\|2",
    s: "[sS5$🆂]+|z|2",
    t: "[tT7†🆃]+|\\+|7",
    u: "[uU🆄]+|\\(\\)|\\|_\\|",
    v: "[vVν🆅]+|\\\\/|\\|/",
    w: "[wWω🆆]+|\\\\/\\\\/|vv",
    x: "[xX×✕✖️❌]+|%|><",
    y: "[yY¥🆈]+",
    z: "[zZ2🆉]+|s|5"
  },
  {
    // Level 5
    a: "(?:[aA@4àáâäæãåαа🅰️🇦𝔞𝕒𝖌𝒶]+|/\\\\|\\\\/|\\(\\)|\\{\\}|\\[\\]|<>|/[_\\-]?\\\\)",
    b: "(?:[bB8ßβ🅱️🇧𝔟𝕓𝖇]+|13|\\|3|\\|\\)\\|)", // OK, \|3 and \|\)\| are fine
    c: "(?:[cCç¢🅲🇨𝔠𝕔]+|\\(+|\\[+|\\{+|<+|[<\\[{][_\\-=~*]*[>\\]}])", // OK
    d: "(?:[dD🅳🇩𝔡𝕕]+|\\|\\)+|\\)\\|+)", // OK
    e: "(?:[eE3èéêë€ε🅴🇪𝔢]+)", // OK
    f: "(?:[fFƒ🅵🇫𝔣]+|ph)", // OK
    g: "(?:[gG69🅶🇬𝔤]+)", // OK
    h: "(?:[hHнн🅷🇭𝔥]+|#|\\|-\\|)", // OK, \|-| is fine (matches |-|)
    i: "(?:[iI1!|íìîï¡🅸🇮𝔦]+|[|!lL]+|\\]\\[|\\|\\|)", // OK
    j: "(?:[jJ🅹🇯𝔧]+|_\\|+)", // OK
    k: "(?:[kKκ🅺🇰𝔨]+|\\|<|\\|\\{|\\|\\(|\\)\\|)", // OK
    l: "(?:[lL1|!🅻🇱𝔩]+|\\|+|!)", // OK
    m: "(?:[mMм🅼🇲𝔪]+|/\\\\/\\\\|\\|\\/\\|\\/|nn|IVI|/V\\\\)", // OK
    n: "(?:[nNñηи🅽🇳𝔫]+|/\\\\/|\\\\/\\\\|\\|\\|)", // OK
    o: "(?:[oO0°οоøⓞ🅾️🇴○◎◯🅾️]+|\\(\\)|\\[\\]|\\{\\}|<>|\\|\\||\\|O\\||0_|_0|\\(O\\)|_\\(\\)_|\\{\\[\\]\\}|\\[\\(\\|\\)\\]|[⭘⭕️🔵🟢🟣🟠🟡🟤⚪️⚫️🔘])", // OK
    p: "(?:[pPρр🅿️🇵𝔭]+|\\|\\*|q\\))", // OK
    q: "(?:[qQ🆀🇶𝔮]+|9)", // OK
    r: "(?:[rRя🆁🇷𝔯]+|\\|2|12|\\|\\?)", // OK
    s: "(?:[sS5$§🆂🇸𝔰]+|z|2|\\$)", // OK
    t: "(?:[tT7†🆃🇹𝔱]+|\\+|7|\\|-|\\|_|-\\|)", // FIXED
    u: "(?:[uUυυ🆄🇺𝔲]+|\\(\\)|v\\\\v|\\|_\\|)", // OK
    v: "(?:[vVν🆅🇻𝔳]+|\\\\/|\\|\\/)", // OK
    w: "(?:[wWωш🆆🇼𝔴]+|\\\\/\\\\/|\\|/\\|/|vv|VV|\\|\\/\\|\\/|\\|V\\|)", // OK
    x: "(?:[xX×✕✖️❌🆇🇽𝔵]+|%|><|\\)\\()", // OK
    y: "(?:[yY¥γу🆈🇾𝔶]+|j\\|)", // OK
    z: "(?:[zZ2ζ🆉🇿𝔷]+|s|5)" // OK
  }
];


// Generate regex for a word + strictness
function generateRegex(word, level) {
    let pattern = '';
    const map = charMaps[level] || {};
    for (const char of word.toLowerCase()) {
        if (map[char]) pattern += `${map[char]}${noise}`;
        else pattern += `${char.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}${noise}`;
    }
    return pattern;
}

// Combine regex for a guild and channel
function getCombinedRegex(guildId, channelId) {
    const guildData = data.guilds[guildId];
    if (!guildData) return null;
    // Only include blacklisted words for this channel (or all)
    const wordPatterns = (guildData.blockedWords || []).filter(bw => {
        if (!bw.channels) return true;
        if (bw.channels === 'all') return true;
        return Array.isArray(bw.channels) && bw.channels.includes(channelId);
    }).map(bw => `(?:${generateRegex(bw.word, bw.level)})`);
    // Only include regexes for this channel (or all)
    const regexPatternsLocal = (guildData.customRegexes || []).map(r => {
        if (typeof r === 'string') return r; // legacy
        if (!r.channels) return r.pattern;
        if (r.channels === 'all') return r.pattern;
        if (Array.isArray(r.channels) && r.channels.includes(channelId)) return r.pattern;
        return null;
    }).filter(Boolean).map(p => `(?:${p})`);
    const allPatternsLocal = [...wordPatterns, ...regexPatternsLocal];
    if (allPatternsLocal.length === 0) return null;
    try {
        return new RegExp(allPatternsLocal.join('|'), 'iu');
    } catch (e) {
        console.error('Invalid combined regex:', e);
        return null;
    }
    // Only include regexes for this channel (or all)
    const regexPatterns = (guildData.customRegexes || []).map(r => {
        if (typeof r === 'string') return r; // legacy
        if (!r.channels) return r.pattern;
        if (r.channels === 'all') return r.pattern;
        if (Array.isArray(r.channels) && r.channels.includes(channelId)) return r.pattern;
        return null;
    }).filter(Boolean).map(p => `(?:${p})`);
    const allPatterns = [...wordPatterns, ...regexPatterns];
    if (allPatterns.length === 0) return null;
    try {
        return new RegExp(allPatterns.join('|'), 'iu');
    } catch (e) {
        console.error('Invalid combined regex:', e);
        return null;
    }
}

// ------------------- Slash Command Registration (Global) -------------------
const commands = [
    new SlashCommandBuilder().setName('addchannel').setDescription('Add a channel to the list (not filtered)')
        .addChannelOption(option => option.setName('channel').setDescription('Channel to list').setRequired(true)),
    new SlashCommandBuilder().setName('removechannel').setDescription('Remove a channel from the list')
        .addChannelOption(option => option.setName('channel').setDescription('Channel to remove from list').setRequired(true)),
    new SlashCommandBuilder().setName('settimeout').setDescription('Set warning message delete timeout (ms)')
        .addIntegerOption(option => option.setName('timeout').setDescription('Timeout in milliseconds').setRequired(true).setMinValue(0)),
    new SlashCommandBuilder().setName('setfiltermode').setDescription('Set filter mode: all channels or list')
        .addStringOption(option => option.setName('mode').setDescription('Mode').setRequired(true).addChoices(
            { name: 'all', value: 'all' },
            { name: 'list', value: 'list' }
        )),
    new SlashCommandBuilder().setName('addblacklist').setDescription('Add a word to the blacklist with strictness 0–5')
        .addStringOption(option => option.setName('word').setDescription('Word to blacklist').setRequired(true))
        .addIntegerOption(option => option.setName('level').setDescription('Strictness level 0–5').setRequired(true).setMinValue(0).setMaxValue(5))
        .addChannelOption(option => option.setName('channel').setDescription('Channel to apply blacklist to (leave empty for all monitored channels)').setRequired(false).addChannelTypes(0)),
    new SlashCommandBuilder().setName('removeblacklist').setDescription('Remove a word from the blacklist')
        .addStringOption(option => option.setName('word').setDescription('Word to remove from blacklist').setRequired(true)),
    new SlashCommandBuilder().setName('addwhitelist').setDescription('Add a word to the whitelist (allowed even if blacklisted)')
        .addStringOption(option => option.setName('word').setDescription('Word to whitelist').setRequired(true)),
    new SlashCommandBuilder().setName('removewhitelist').setDescription('Remove a word from the whitelist')
        .addStringOption(option => option.setName('word').setDescription('Word to remove from whitelist').setRequired(true)),
    new SlashCommandBuilder().setName('addregex').setDescription('Add a custom regex')
        .addStringOption(option => option.setName('pattern').setDescription('Regex pattern').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('Channel to apply regex to (leave empty for all monitored channels)').setRequired(false).addChannelTypes(0)),
    new SlashCommandBuilder().setName('removeregex').setDescription('Remove a custom regex by index')
        .addIntegerOption(option => option.setName('index').setDescription('Index starting from 1').setRequired(true)),
    new SlashCommandBuilder().setName('help').setDescription('Show help and command usage'),
    new SlashCommandBuilder().setName('addimmunerole').setDescription('Add a role immune to filtering')
        .addRoleOption(option => option.setName('role').setDescription('Role to make immune').setRequired(true)),
    new SlashCommandBuilder().setName('removeimmunerole').setDescription('Remove a role from immune list')
        .addRoleOption(option => option.setName('role').setDescription('Role to remove').setRequired(true)),
    new SlashCommandBuilder().setName('listsettings').setDescription('List all settings for this server')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try {
        console.log('Registering global commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('Global commands registered.');
    } catch (err) { console.error(err); }
})();

// ------------------- Bot Events -------------------
client.on('ready', () => console.log(`Logged in as ${client.user.tag}`));

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    // Allow anyone to use 'help' and 'listsettings', restrict others
    const openCommands = ['help', 'listsettings'];
    if (!openCommands.includes(interaction.commandName) && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({ content: 'You do not have permission.' });
    }

    const guildId = interaction.guildId;
    if (!data.guilds[guildId]) data.guilds[guildId] = { monitoredChannels: [], blockedWords: [], customRegexes: [], immuneRoles: [], whitelist: [] };
    if (!data.guilds[guildId].immuneRoles) data.guilds[guildId].immuneRoles = [];
    if (!data.guilds[guildId].whitelist) data.guilds[guildId].whitelist = [];
    const guildData = data.guilds[guildId];

    switch(interaction.commandName) {
        case 'addwhitelist': {
            const word = interaction.options.getString('word').toLowerCase();
            if (guildData.whitelist.includes(word)) {
                await interaction.reply({ content: `❌ The word "${word}" is already whitelisted.` });
                break;
            }
            guildData.whitelist.push(word);
            saveData();
            await interaction.reply(`✅ Word "${word}" added to whitelist.`);
            break;
        }
        case 'removewhitelist': {
            const word = interaction.options.getString('word').toLowerCase();
            if (!guildData.whitelist.includes(word)) {
                await interaction.reply({ content: `❌ The word "${word}" is not in the whitelist.` });
                break;
            }
            guildData.whitelist = guildData.whitelist.filter(w => w !== word);
            saveData();
            await interaction.reply(`✅ Word "${word}" removed from whitelist.`);
            break;
        }
        case 'addblacklist': {
            const word = interaction.options.getString('word').toLowerCase();
            const level = interaction.options.getInteger('level');
            const channel = interaction.options.getChannel('channel');
            let channels = null;
            if (channel) {
                channels = [channel.id];
            } else {
                channels = 'all';
            }
            // Allow same word in different channels
            if (guildData.blockedWords.some(bw => bw.word === word && (
                (channels === 'all' || bw.channels === 'all') ||
                (Array.isArray(bw.channels) && Array.isArray(channels) && bw.channels.some(c => channels.includes(c)))
            ))) {
                await interaction.reply({ content: `❌ The word "${word}" is already blacklisted for the same channel(s) or all channels.` });
                break;
            }
            guildData.blockedWords.push({ word, level, channels });
            saveData();
            let msg = `✅ Word "${word}" added to blacklist with strictness level ${level}`;
            if (channels && channels !== 'all') {
                msg += ` (applies to channel: <#${channels[0]}>)`;
            } else {
                msg += ' (applies to all monitored channels)';
            }
            if (
                (!guildData.monitoredChannels || guildData.monitoredChannels.length === 0)
                && (guildData.filterMode !== 'all')
            ) {
                msg += '\n⚠️ No channels are being monitored. Use /addchannel to add one or set filter mode to all.';
            }
            await interaction.reply(msg);
            break;
        }
        case 'removeblacklist': {
            const word = interaction.options.getString('word').toLowerCase();
            guildData.blockedWords = guildData.blockedWords.filter(bw => bw.word !== word);
            saveData();
            await interaction.reply(`✅ Word "${word}" removed from blacklist.`);
            break;
        }
        // ...existing code...
        case 'addimmunerole': {
            const role = interaction.options.getRole('role');
            if (guildData.immuneRoles.includes(role.id)) {
                await interaction.reply({ content: `❌ <@&${role.id}> is already immune to filtering.` });
                break;
            }
            guildData.immuneRoles.push(role.id);
            saveData();
            await interaction.reply(`✅ <@&${role.id}> is now immune to filtering.`);
            break;
        }
        case 'removeimmunerole': {
            const role = interaction.options.getRole('role');
            if (!guildData.immuneRoles.includes(role.id)) {
                await interaction.reply({ content: `❌ <@&${role.id}> is not immune.` });
                break;
            }
            guildData.immuneRoles = guildData.immuneRoles.filter(rid => rid !== role.id);
            saveData();
            await interaction.reply(`✅ <@&${role.id}> is no longer immune to filtering.`);
            break;
        }
        case 'help': {
            const helpEmbed = new EmbedBuilder()
                .setTitle('No Goon Help')
                .setColor(0xF44336)
                .setDescription(
`**/setfiltermode <all|list>**  
Set filtering mode:
- **all**: Filter all channels except those in the list.
- **list**: Only filter channels in the list.

**/addchannel <channel>**  
Add a channel to the list (not filtered if mode is "all", only filtered if mode is "list").

**/removechannel <channel>**  
Remove a channel from the list.

**/settimeout <ms>**  
Set how long (in ms) before the bot deletes its warning message.


**/addblacklist <word> <level 0-5> [channel]**  
Add a word to the blacklist, with optional channel restriction. If no channel is selected, the word is blocked in all monitored channels.  
Strictness levels:
- 0: Exact match
- 1: Common substitutions (e.g. a/A/4)
- 2-4: Increasingly aggressive substitutions (e.g. leetspeak, symbols, unicode)
- 5: Most aggressive, includes many lookalikes
> **Note:** If a word or regex is set for a specific channel, it will always be filtered in that channel, even if the channel is not monitored. The monitored channel list/filter mode only applies to words/regexes set for "all monitored channels".

**/removeblacklist <word>**  
Remove a word from the blacklist.

**/addwhitelist <word>**  
Add a word to the whitelist (allowed even if blacklisted).

**/removewhitelist <word>**  
Remove a word from the whitelist.


**/addregex <pattern> [channel]**  
Add a custom regex pattern to block, with optional channel restriction. If no channel is selected, the regex is blocked in all monitored channels.
> **Note:** If a word or regex is set for a specific channel, it will always be filtered in that channel, even if the channel is not monitored. The monitored channel list/filter mode only applies to words/regexes set for "all monitored channels".

**/removeregex <index>**  
Remove a custom regex by its index (see your settings).

**/addimmunerole <role>**  
Add a role immune to filtering.

**/removeimmunerole <role>**  
Remove a role from the immune list.

**/listsettings**  
Show all settings for this server.

__**Defaults:**__  
• Filter mode: **list**  
• Warning delete timeout: **2000 ms**  
• No channels listed by default  
• No words or regexes blocked by default  
• No immune roles by default

*Only users with the Manage Messages permission can use these commands.*`
                );
            await interaction.reply({ embeds: [helpEmbed] });
            break;
        }
        case 'settimeout': {
            const timeout = interaction.options.getInteger('timeout');
            guildData.deleteTimeout = timeout;
            saveData();
            await interaction.reply(`✅ Warning message delete timeout set to ${timeout} ms.`);
            break;
        }
        case 'setfiltermode': {
            const mode = interaction.options.getString('mode');
            guildData.filterMode = mode;
            saveData();
            await interaction.reply(`✅ Filter mode set to "${mode}".`);
            break;
        }
        case 'addchannel': {
            const channel = interaction.options.getChannel('channel');
            if (!guildData.monitoredChannels) guildData.monitoredChannels = [];
            if (guildData.monitoredChannels.includes(channel.id)) {
                await interaction.reply({ content: `❌ Channel <#${channel.id}> is already listed.` });
                break;
            }
            guildData.monitoredChannels.push(channel.id);
            saveData();
            await interaction.reply(`✅ Channel <#${channel.id}> added to list (not filtered).`);
            break;
        }
        case 'removechannel': {
            const channel = interaction.options.getChannel('channel');
            if (!guildData.monitoredChannels || !guildData.monitoredChannels.includes(channel.id)) {
                await interaction.reply({ content: `❌ Channel <#${channel.id}> is not in the list.` });
                break;
            }
            guildData.monitoredChannels = guildData.monitoredChannels.filter(cid => cid !== channel.id);
            saveData();
            await interaction.reply(`✅ Channel <#${channel.id}> removed from list.`);
            break;
        }
        case 'addword': {
            const word = interaction.options.getString('word').toLowerCase();
            const level = interaction.options.getInteger('level');
            if (guildData.blockedWords.some(bw => bw.word === word)) {
                await interaction.reply({ content: `❌ The word "${word}" is already blocked.` });
                break;
            }
            guildData.blockedWords.push({ word, level });
            saveData();
            let msg = `✅ Word "${word}" added with strictness level ${level}.`;
            if (
                (!guildData.monitoredChannels || guildData.monitoredChannels.length === 0)
                && (guildData.filterMode !== 'all')
            ) {
                msg += '\n⚠️ No channels are being monitored. Use /addchannel to add one or set filter mode to all.';
            }
            await interaction.reply(msg);
            break;
        }
        case 'removeword': {
            const word = interaction.options.getString('word').toLowerCase();
            guildData.blockedWords = guildData.blockedWords.filter(bw => bw.word !== word);
            saveData();
            await interaction.reply(`✅ Word "${word}" removed.`);
            break;
        }
        case 'addregex': {
            const pattern = interaction.options.getString('pattern');
            const channel = interaction.options.getChannel('channel');
            let channels = null;
            if (channel) {
                channels = [channel.id];
            } else {
                channels = 'all';
            }
            if ((guildData.customRegexes || []).some(r => (typeof r === 'string' ? r : r.pattern) === pattern)) {
                await interaction.reply({ content: '❌ This regex pattern is already blocked.' });
                break;
            }
            try {
                new RegExp(pattern);
                if (!guildData.customRegexes) guildData.customRegexes = [];
                guildData.customRegexes.push({ pattern, channels });
                saveData();
                let msg = '✅ Custom regex added.';
                if (channels && channels !== 'all') {
                    msg += ` (applies to channel: <#${channels[0]}>)`;
                } else {
                    msg += ' (applies to all monitored channels)';
                }
                if (
                    (!guildData.monitoredChannels || guildData.monitoredChannels.length === 0)
                    && (guildData.filterMode !== 'all')
                ) {
                    msg += '\n⚠️ No channels are being monitored. Use /addchannel to add one or set filter mode to all.';
                }
                await interaction.reply(msg);
            } catch {
                await interaction.reply({ content: '❌ Invalid regex.' });
            }
            break;
        }
        case 'removeregex': {
            const index = interaction.options.getInteger('index') - 1;
            if (index < 0 || index >= (guildData.customRegexes || []).length) {
                await interaction.reply({ content: '❌ Invalid index.' });
            } else {
                const removed = guildData.customRegexes.splice(index, 1)[0];
                saveData();
                await interaction.reply(`✅ Removed regex: \`${removed}\``);
            }
            break;
        }
        case 'listsettings': {
            const filterMode = guildData.filterMode || 'all';
            const timeout = guildData.deleteTimeout ?? DEFAULT_DELETE_TIMEOUT;
            const monitoredChannels = guildData.monitoredChannels?.map(id => `<#${id}>`).join(', ') || 'None';
            const blockedWords = (guildData.blockedWords && guildData.blockedWords.length)
    ? guildData.blockedWords.map(bw => {
        let ch = '';
        if (bw.channels) {
            if (bw.channels === 'all') {
                ch = ' [all channels]';
            } else if (Array.isArray(bw.channels)) {
                ch = ` [channel: <#${bw.channels[0]}>]`;
            }
        }
        return `"${bw.word}" (level ${bw.level})${ch}`;
    }).join(', ')
    : 'None';
            const whitelistWords = (guildData.whitelist && guildData.whitelist.length)
                ? guildData.whitelist.map(w => `"${w}"`).join(', ')
                : 'None';
            const customRegexes = (guildData.customRegexes && guildData.customRegexes.length)
    ? guildData.customRegexes.map((r, i) => {
        if (typeof r === 'string') return `\`${r}\` (${i+1})`;
        let ch = '';
        if (r.channels) {
            if (r.channels === 'all') {
                ch = ' [all channels]';
            } else if (Array.isArray(r.channels)) {
                ch = ` [channel: <#${r.channels[0]}>]`;
            }
        }
        return `\`${r.pattern}\`${ch} (${i+1})`;
    }).join(', ')
    : 'None';
            const immuneRoles = guildData.immuneRoles?.map(rid => `<@&${rid}>`).join(', ') || 'None';
            const settingsEmbed = new EmbedBuilder()
                .setTitle('Server Settings')
                .setColor(0xF44336)
                .addFields(
                    { name: 'Filter Mode', value: filterMode.charAt(0).toUpperCase() + filterMode.slice(1), inline: true },
                    { name: 'Warning Delete Timeout', value: `${timeout} ms`, inline: true },
                    { name: 'Listed Channels', value: monitoredChannels, inline: false },
                    { name: 'Blacklisted Words', value: blockedWords, inline: false },
                    { name: 'Whitelisted Words', value: whitelistWords, inline: false },
                    { name: 'Custom Regexes', value: customRegexes, inline: false },
                    { name: 'Immune Roles', value: immuneRoles, inline: false }
                );
            await interaction.reply({ embeds: [settingsEmbed]});
            break;
        }
    }
});

// ------------------- Message Filtering -------------------
const DEFAULT_DELETE_TIMEOUT = 2000;

function shouldFilterChannel(guildData, channelId, forWordOrRegex = false) {
    if (forWordOrRegex) return true;
    const mode = guildData.filterMode || 'all';
    if (mode === 'all') {
        return !(guildData.monitoredChannels || []).includes(channelId);
    } else {
        return (guildData.monitoredChannels || []).includes(channelId);
    }
}

client.on('messageCreate', async message => {
    try {
        if (message.author.bot || !message.guild) return;
        const guildId = message.guild.id;
        const guildData = data.guilds[guildId];
        if (!guildData) return;
        if (guildData.immuneRoles && message.member && message.member.roles.cache.some(role => guildData.immuneRoles.includes(role.id))) {
            return;
        }
        // If any word/regex is set for this channel, always filter for it
        const regex = getCombinedRegex(guildId, message.channel.id);
        const hasSpecific = (guildData.blockedWords || []).some(bw => Array.isArray(bw.channels) && bw.channels.includes(message.channel.id)) ||
            (guildData.customRegexes || []).some(r => typeof r !== 'string' && Array.isArray(r.channels) && r.channels.includes(message.channel.id));
        if (!shouldFilterChannel(guildData, message.channel.id, hasSpecific)) return;
        if (!regex) {
            const msg = await message.channel.send('❌ Regex filter is invalid. Please fix your custom regexes.');
            setTimeout(() => msg.delete().catch(() => {}), guildData.deleteTimeout ?? DEFAULT_DELETE_TIMEOUT);
            return;
        }
        // Whitelist check: if any whitelisted word is present, allow message
        if (regex.test(message.content)) {
            if (guildData.whitelist && guildData.whitelist.some(w => new RegExp(`\\b${w}\\b`, 'iu').test(message.content))) {
                return;
            }
            try {
                await message.delete();
                const warnMsg = await message.channel.send(`${message.author}, your message contained prohibited words.`);
                setTimeout(() => warnMsg.delete().catch(() => {}), guildData.deleteTimeout ?? DEFAULT_DELETE_TIMEOUT);
            } catch (err) { console.error('Error deleting message:', err); }
        }
    } catch (err) {
        console.error('Error in messageCreate handler:', err);
    }
    process.on('uncaughtException', (err) => {
        console.error('Uncaught Exception:', err);
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
});

// Check edited messages for banned words
client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
        if (!newMessage.guild || newMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;
        const guildId = newMessage.guild.id;
        const guildData = data.guilds[guildId];
        if (!guildData) return;
        // If any word/regex is set for this channel, always filter for it
        const hasSpecific = (guildData.blockedWords || []).some(bw => Array.isArray(bw.channels) && bw.channels.includes(newMessage.channel.id)) ||
            (guildData.customRegexes || []).some(r => typeof r !== 'string' && Array.isArray(r.channels) && r.channels.includes(newMessage.channel.id));
        if (!shouldFilterChannel(guildData, newMessage.channel.id, hasSpecific)) return;
        if (
            guildData.immuneRoles &&
            newMessage.member &&
            newMessage.member.roles.cache.some(role => guildData.immuneRoles.includes(role.id))
        ) {
            return;
        }
        const regex = getCombinedRegex(guildId, newMessage.channel.id);
        if (!regex) {
            const msg = await newMessage.channel.send('❌ Regex filter is invalid. Please fix your custom regexes.');
            setTimeout(() => msg.delete().catch(() => {}), guildData.deleteTimeout ?? DEFAULT_DELETE_TIMEOUT);
            return;
        }
        // Whitelist check: if any whitelisted word is present, allow message
        if (regex.test(newMessage.content)) {
            if (guildData.whitelist && guildData.whitelist.some(w => new RegExp(`\\b${w}\\b`, 'iu').test(newMessage.content))) {
                return;
            }
            try {
                await newMessage.delete();
                const warnMsg = await newMessage.channel.send(`${newMessage.author}, your edited message contained prohibited words.`);
                setTimeout(() => warnMsg.delete().catch(() => {}), guildData.deleteTimeout ?? DEFAULT_DELETE_TIMEOUT);
            } catch (err) { console.error('Error deleting edited message:', err); }
        }
    } catch (err) {
        console.error('Error in messageUpdate handler:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);
