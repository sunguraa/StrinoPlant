/**
 * Lightweight local copy of the StrinoBans profanity filter for identity names.
 * Keep in sync with the source list in StrinoBans/src/lib/filters.ts.
 */

const ENCODED_BLOCKLIST: string[] = [
  "2 tveyf 1 phc", "2t1p", "4e5r", "5u1g", "5uvg", "n55", "n_f_f", "npebgbzbcuvyvn", "nynonzn ubg cbpxrg", "nynfxna cvcryvar", "nany", "navyvathf",
  "nahf", "ncrfuvg", "ne5r", "neefr", "nefr", "nefrubyr", "nff", "nff-shpxre", "nff-ung", "nff-cvengr", "nffont", "nffonaqvg",
  "nffonatre", "nffovgr", "nffpybja", "nffpbpx", "nffpenpxre", "nffrf", "nffsnpr", "nffshpxre", "nffshxxn", "nfftboyva", "nffung", "nffurnq",
  "nffubyr", "nffubyrf", "nffubccre", "nffwnpxre", "nffyvpx", "nffyvpxre", "nffzbaxrl", "nffzhapu", "nffzhapure", "nffcvengr", "nfffubyr", "nfffhpxre",
  "nffjnq", "nffjubyr", "nffjvcr", "nhgb rebgvp", "nhgbrebgvp", "o!gpu", "o00of", "o17pu", "o1gpu", "onorynaq", "onol onggre", "onol whvpr",
  "onyy tnt", "onyy tenil", "onyy xvpxvat", "onyy yvpxvat", "onyy fnpx", "onyy fhpxvat", "onyyont", "onyyf", "onyyfnpx", "onzcbg", "onatoebf", "oneronpx",
  "oneryl yrtny", "oneranxrq", "onfgneq", "onfgneqb", "onfgvanqb", "ooj", "oqfz", "ornare", "ornaref", "ornfgvny", "ornfgvnyvgl", "ornfgvyvgl",
  "ornire pyrnire", "ornire yvcf", "oryyraq", "orfgvny", "orfgvnyvgl", "ov+pu", "ovngpu", "ovt oynpx", "ovt oernfgf", "ovt xabpxref", "ovt gvgf", "ovzobf",
  "oveqybpx", "ovgpu", "ovgpure", "ovgpuref", "ovgpurf", "ovgpuva", "ovgpuvat", "oynpx pbpx", "oybaqr npgvba", "oybaqr ba oybaqr npgvba", "oybbql", "oybj wbo",
  "oybj lbhe ybnq", "oybjwbo", "oybjwbof", "oyhr jnssyr", "oyhzcxva", "obvbynf", "obyybpx", "obyybpxf", "obyybx", "obyybk", "obaqntr", "obare",
  "obbo", "obbovr", "obbof", "obbbof", "obbbbof", "obbbbbof", "obbbbbbbof", "obbgl pnyy", "oernfgf", "oebja fubjref", "oeharggr npgvba", "ohprgn",
  "ohttre", "ohxxnxr", "ohyyqlxr", "ohyyrg ivor", "ohyyfuvg", "ohz", "ohat ubyr", "ohatubyr", "ohaal shpxre", "ohfgv", "ohgg", "ohgg-cvengr",
  "ohggpurrxf", "ohggubyr", "ohggzhapu", "ohggcyht", "p0px", "p0pxfhpxre", "pnzry gbr", "pnztvey", "pnzfyhg", "pnzjbuer", "pnecrg zhapure", "pnecrgzhapure",
  "pnjx", "puvap", "puvax", "pubnq", "pubpbyngr ebfrohqf", "pubqr", "pvcn", "pvepyrwrax", "py1g", "pyrirynaq fgrnzre", "pyvg", "pyvgsnpr",
  "pyvgbevf", "pyvgf", "pybire pynzcf", "pyhfgreshpx", "pahg", "pbpx", "pbpx-fhpxre", "pbpxovgr", "pbpxohetre", "pbpxsnpr", "pbpxurnq", "pbpxwbpxrl",
  "pbpxxabxre", "pbpxznfgre", "pbpxzbatyre", "pbpxzbatehry", "pbpxzbaxrl", "pbpxzhapu", "pbpxzhapure", "pbpxabfr", "pbpxnhttrg", "pbpxf", "pbpxfuvg", "pbpxfzvgu",
  "pbpxfzbxre", "pbpxfhpx", "pbpxfhpxrq", "pbpxfhpxre", "pbpxfhpxvat", "pbpxfuxn", "pbpxfuxxn", "pbx", "pbxzhapure", "pbxfhpxn", "pbbpuvr", "pbbpul",
  "pbba", "pbbaf", "pbbgre", "pbcebcuvyvn", "pbcebcuvyvn", "pbeaubyr", "pbk", "penc", "pernzcvr", "phz", "phzubbooyr", "phzqhzcfgre",
  "phzthmmyre", "phzwbpxrl", "phzzre", "phzzvat", "phzf", "phzfubg", "phzfyhg", "phzgnec", "phavyvathf", "phavyyvathf", "phaavr", "phaavyvathf",
  "phag", "phagsnpr", "phagubyr", "phagyvpx", "phagyvpxre", "phagyvpxvat", "phagent", "phagf", "plnyvf", "ploreshp", "ploreshpx", "ploreshpxrq",
  "ploreshpxre", "ploreshpxref", "ploreshpxvat", "q1px", "qnzzvg", "qnza", "qnexvr", "qngr encr", "qngrencr", "qrrc guebng", "qrrcguebng", "qraqebcuvyvn",
  "qvpx", "qvpxont", "qvpxorngre", "qvpxsnpr", "qvpxurnq", "qvpxubyr", "qvpxwhvpr", "qvpxzvyx", "qvpxzbatre", "qvpxfync", "qvpxfhpxre", "qvpxjnq",
  "qvpxjrnfry", "qvpxjrrq", "qvpxjbq", "qvxr", "qvyqb", "qvyqbf", "qvatyroreevrf", "qvatyroreel", "qvax", "qvaxf", "qvcfuvg", "qvefn",
  "qvegl cvyybjf", "qvegl fnapurm", "dypx", "qbt fglyr", "qbt-shpxre", "qbttvr fglyr", "qbttvrfglyr", "qbttva", "qbttvat", "qbttl fglyr", "qbttlfglyr", "qbyprgg",
  "qbzvangvba", "qbzvangevk", "qbzzrf", "qbaxrl chapu", "qbaxrlevoore", "qbbpuont", "qbbxvr", "qbbfu", "qbhoyr qbat", "qbhoyr crargengvba", "qbhpur", "qbhpuront",
  "qc npgvba", "qel uhzc", "qhpur", "qhzo", "qhzofuvg", "qhzfuvg", "qiqn", "qlxr", "rng zl nff", "rppuv", "rwnphyngr", "rwnphyngrq",
  "rwnphyngrf", "rwnphyngvat", "rwnphyngvatf", "rwnphyngvba", "rwnxhyngr", "rebgvp", "rebgvfz", "rfpbeg", "rhahpu", "s h p x", "s h p x r e", "s4nal",
  "s_h_p_x", "snt", "sntont", "sntg", "snttvat", "snttvtt", "snttvtt", "snttbg", "sntgf", "sntbg", "sntbgf", "sntf",
  "snttneq", "snaal", "snaalsyncf", "snaalshpxre", "snall", "sneg", "snegrq", "snegvat", "snegl", "sngnff", "sphx", "sphxre",
  "sphxvat", "srpny", "srpx", "srpxre", "sryngvb", "srypu", "srypuvat", "sryyngr", "sryyngvb", "srygpu", "srznyr fdhvegvat", "srzqbz",
  "svttvat", "svatreonat", "svatreshpx", "svatreshpxrq", "svatreshpxre", "svatreshpxref", "svatreshpxvat", "svatreshpxf", "svatrevat", "svfgshpx", "svfgshpxrq", "svfgshpxre",
  "svfgshpxref", "svfgshpxvat", "svfgshpxvatf", "svfgshpxf", "svfgvat", "synzre", "synatr", "sbbx", "sbbxre", "sbby", "sbbg srgvfu", "sbbgwbo",
  "sebggvat", "shpx", "shpx ohggbaf", "shpxn", "shpxrq", "shpxre", "shpxref", "shpxurnq", "shpxurnqf", "shpxva", "shpxvat", "shpxvatf",
  "shpxvatfuvgzbgureshpxre", "shpxzr", "shpxf", "shpxgneqf", "shpxjuvg", "shpxjvg", "shqtr cnpxre", "shqtrcnpxre", "shx", "shxre", "shxxre", "shxxva",
  "shxf", "shxwuvg", "shxjvg", "shgnanev", "shk", "shk0e", "t-fcbg", "tnat onat", "tnatonat", "tnatonatrq", "tnatonatf", "tnl frk",
  "tnlnff", "tnlobo", "tnlybeq", "tnlfrk", "tnltneq", "tnljneq", "travgnyf", "tvnag pbpx", "tvey ba", "tvey ba gbc", "tveyf tbar jvyq", "tbngpk",
  "tbngfr", "tbq qnza", "tbq-qnz", "tbq-qnzarq", "tbqqnza", "tbqqnzarq", "tbxxha", "tbyqra fubjre", "tbb tvey", "tbbpu", "tbbqcbbc", "tbbx",
  "tbertnfz", "tevatb", "tebcr", "tebhc frk", "thvqb", "theb", "unaq wbo", "unaqwbo", "uneq pber", "uneqpber", "uneqpberfrk", "urro",
  "uryy", "uragnv", "urfur", "ub", "ubne", "ubner", "ubr", "ubre", "ubzb", "ubzbrebgvp", "ubaxrl", "ubaxl",
  "ubbxre", "uber", "ubeavrfg", "ubeal", "ubg pney", "ubg puvpx", "ubgfrk", "ubj gb xvyy", "ubj gb zheqre", "uhtr sng", "uhzcvat", "vaprfg",
  "vagrepbhefr", "wnpx bss", "wnpx-bss", "wnpxnff", "wnpxbss", "wnvy onvg", "wnvyonvg", "wnc", "wryyl qbahg", "wrex", "wrex bss", "wrex-bss",
  "wvtnobb", "wvttnobb", "wvttreobb", "wvfz", "wvm", "wvm", "wvmz", "wvmz", "wvmm", "whttf", "xnjx", "xvxr",
  "xvaonxh", "xvaxfgre", "xvaxy", "xvhag", "xabo", "xaboovat", "xabornq", "xaborq", "xaboraq", "xabournq", "xabowbpxl", "xabowbxrl",
  "xbpx", "xbaqhz", "xbaqhzf", "xbbpu", "xbbgpu", "xhz", "xhzre", "xhzzre", "xhzzvat", "xhzf", "xhavyvathf", "xhag",
  "xyxr", "y3v+pu", "y3vgpu", "ynovn", "yrngure erfgenvag", "yrngure fgenvtug wnpxrg", "yrzba cnegl", "yrfob", "yrmmvr", "yzsnb", "ybyvgn", "ybirznxvat",
  "yhfg", "yhfgvat", "z0s0", "z0sb", "z45greongr", "zn5greo8", "zn5greongr", "znxr zr pbzr", "znnyr fdhvegvat", "znfbpuvfg", "znfgre-ongr", "znfgreo8",
  "znfgreong*", "znfgreong3", "znfgreongr", "znfgreongvba", "znfgreongvbaf", "znfgherngr", "zrantr n gebvf", "zvys", "zvat", "zvffvbanel cbfvgvba", "zb-sb", "zbs0",
  "zbsb", "zbgunshpx", "zbgunshpxn", "zbgunshpxnf", "zbgunshpxnm", "zbgunshpxrq", "zbgunshpxre", "zbgunshpxref", "zbgunshpxva", "zbgunshpxvat", "zbgunshpxvatf", "zbgunshpxf",
  "zbgure shpxre", "zbgureshpx", "zbgureshpxrq", "zbgureshpxre", "zbgureshpxref", "zbgureshpxva", "zbgureshpxvat", "zbgureshpxvatf", "zbgureshpxxn", "zbgureshpxf", "zbhaq bs irahf", "ze unaqf",
  "zhss", "zhss qvire", "zhssqvire", "zhssqvivat", "zhgun", "zhgunsrpxre", "zhgunshpxxre", "zhgure", "zhgureshpxre", "a1ttn", "a1ttre", "nzoyn",
  "anjnfuv", "anmv", "arteb", "arbanmv", "avt abt", "avtt3e", "avtt4u", "avttn", "avttnu", "avttnf", "avttnm", "avttre",
  "avttref", "avtyrg", "avzcubznavn", "avccyr", "avccyrf", "abo", "abo wbxrl", "abournq", "abowbpxl", "abowbxrl", "afsj vzntrf", "ahqr",
  "ahqvgl", "ahzoahgf", "ahgfnpx", "alzpub", "alzpubznavn", "bpgbchffl", "bzbenfuv", "bar phc gjb tveyf", "bar thl bar wne", "betnfvz", "betnfvz", "betnfvzf",
  "betnfz", "betnfzf", "betl", "c0ea", "cnrqbcuvyr", "cnkv", "cnabbpu", "cnagvrf", "cnagl", "cnja", "crpxre", "crpxreurnq",
  "crqorne", "crqbcuvyr", "crttvat", "cravf", "cravfshpxre", "cubar frk", "cubarfrk", "cuhpx", "cuhx", "cuhxrq", "cuhxxvat", "cuhxxrq",
  "cuhxxvat", "cuhxf", "cuhd", "cvrpr bs fuvg", "cvtshpxre", "cvzcvf", "cvf", "cvfrf", "cvfva", "cvfvat", "cvfbs", "cvff",
  "cvff cvt", "cvffrq", "cvffre", "cvffref", "cvffrf", "cvffsync", "cvffsyncf", "cvffva", "cvffva", "cvffvat", "cvffbss", "cvffbss",
  "cvffcvt", "cynlobl", "cyrnfher purfg", "cbyr fzbxre", "cbyrfzbxre", "cbyybpx", "cbalcynl", "cbb", "cbbs", "cbba", "cbbanav", "cbbanal",
  "cbbagnat", "cbbc", "cbbc puhgr", "cbbcpuhgr", "cbea", "cbeab", "cbeabtencul", "cbeabf", "cevpx", "cevpxf", "cevapr nyoreg cvrepvat", "ceban",
  "cgup", "chor", "chorf", "chanaal", "chanal", "chagn", "chvfvrf", "chffr", "chffv", "chffvrf", "chffy", "chfflyvpxvat",
  "chfff", "chfl", "chgb", "dhrns", "dhrrs", "dhrreonvg", "dhrreubyr", "dhvz", "enturnq", "entvat obare", "encr", "encvat",
  "encvfg", "erpghz", "erabo", "ergneq", "erirefr pbjtvey", "evzwnj", "evzwbo", "evzzvat", "ebfl cnyz", "ebfl cnyz naq ure 5 fvfgref", "ehfxv", "ehfgl gebzobar",
  "s uvg", "f&z", "f.b.o.", "f_h_v_g", "fnqvfz", "fnqvfg", "fnagbehz", "fpng", "fpuybat", "fpvffbevat", "fperjvat", "fpebng",
  "fpebgr", "fpebghz", "frzra", "frk", "frkob", "frkl", "fu!+", "fu!g", "fu1g", "funt", "funttre", "funttva",
  "funttvat", "funirq ornire", "funirq chffl", "furznyr", "fuv+", "fuvonev", "fuvg", "fuvg-nff", "fuvg-ont", "fuvg-onttre", "fuvg-oenva", "fuvg-oerngu",
  "fuvg-phag", "fuvg-qvpx", "fuvg-rngvat", "fuvg-snpr", "fuvg-snprq", "fuvg-svg", "fuvg-urnq", "fuvg-urry", "fuvg-ubyr", "fuvg-ubhfr", "fuvg-ybnq", "fuvg-cbg",
  "fuvg-fcvggre", "fuvg-fgnva", "fuvgnff", "fuvgont", "fuvgonttre", "fuvgoyvzc", "fuvgoenvn", "fuvgoerngu", "fuvgphag", "fuvgqvpx", "fuvgr", "fuvgrngvat",
  "fuvgrq", "fuvgryl", "fuvgsnpr", "fuvgsnprq", "fuvgsvg", "fuvgshpx", "fuvgshyy", "fuvgurnq", "fuvgurry", "fuvgubyr", "fuvgubhfr", "fuvgvat",
  "fuvgvatf", "fuvgybnq", "fuvgcbg", "fuvgf", "fuvgfcvggre", "fuvgfgnva", "fuvggrq", "fuvggre", "fuvggref", "fuvggvrfg", "fuvggvat", "fuvggvatf",
  "fuvggl", "fuvggl", "fuvgl", "fuvm", "fuvmavg", "fubgn", "fuevzcvat", "fxnax", "fxrrg", "fyhg", "fyhgf", "fyhgong",
  "fzhg", "fangpu", "fabjonyyvat", "fbqbzvtr", "fbqbzl", "fba-bs-n-ovgpu", "fcnp", "fcvp", "fcvpx", "fcybbtr", "fcybbtr zbbfr", "fcbbtr",
  "fcernq yrtf", "fchax", "fgenc ba", "fgencba", "fgenccnqb", "fgevc pyho", "fglyr qbttl", "fhpx", "fhpxre", "fhpxf", "fhvpvqr tveyf", "fhygel jbzra",
  "fjnfgvxn", "fjvatre", "g1gg1r5", "g1ggvrf", "gnvagrq ybir", "gneq", "gnfgr zl", "grn onttvat", "grrgf", "grrm", "grfgvpny", "grfgvpyr",
  "guerrfbzr", "guebngvat", "guhaqrephag", "gvrq hc", "gvtug juvgr", "gvg", "gvgshpx", "gvgf", "gvgg", "gvggvr5", "gvggvrshpxre", "gvggvrf",
  "gvggl", "gvgglshpx", "gvggljnax", "gvgjnax", "gbathr va n", "gbcyrff", "gbffre", "gbjryurnq", "genaal", "gevonqvfz", "gho tvey", "ghotvey",
  "gheq", "ghful", "gw4g", "gwng", "gwngurnq", "gwngyvcf", "gwnggl", "gjvax", "gjvaxvr", "gjb tveyf bar phc", "gwbag", "gwbagre",
  "haqerffvat", "hcfxveg", "herguen cynl", "hebcuvyvn", "i14ten", "i1ten", "in-w-w", "int", "intvan", "irahf zbhaq", "ivnten", "ivoengbe",
  "ivbyrg jnaq", "iwnlwnl", "ibbercuvyvn", "iblrhe", "ihyhn", "j00fr", "jnat", "jnax", "jnaxre", "jnaxl", "jrg qernz", "jrgonpx",
  "juvgr cbjre", "jubne", "juber", "jvyyvrf", "jvyyl", "jevccvat zra", "jevaxyrq fgnesvfu", "kengrq", "kk", "kkk", "lnbv", "lryybj fubjref",
  "lvssl", "mbbcuvyvn", "🖕"
];

function rot13(s: string): string {
  return s
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 97 && code <= 122) {
        return String.fromCharCode(((code - 97 + 13) % 26) + 97);
      }
      return ch;
    })
    .join("");
}

const DECODED_BLOCKLIST = ENCODED_BLOCKLIST.map(rot13);

const NON_WORD_CHARS = /[^a-z0-9]+/gi;

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(NON_WORD_CHARS)
    .filter((t) => t.length > 0);
}

export function isNameClean(name: string): boolean {
  const tokens = nameTokens(name);
  return !tokens.some((token) => DECODED_BLOCKLIST.includes(token));
}

export const NAME_FILTER_ERROR = "Names cannot contain offensive language.";
