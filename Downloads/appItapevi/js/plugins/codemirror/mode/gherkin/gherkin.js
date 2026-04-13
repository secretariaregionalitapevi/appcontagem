// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

/*
Gherkin mode - http://www.cukes.info/
Report bugs/issues here: https://github.com/codemirror/CodeMirror/issues
*/

// Following Objs from Brackets implementation: https://github.com/tregusti/brackets-gherkin/blob/master/main.js
//var Quotes = {
//  SINGLE: 1,
//  DOUBLE: 2
//};

//var regex = {
//  keywords: /(Feature| {2}(Scenario|In order to|As|I)| {4}(Given|When|Then|And))/
//};

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("gherkin", function () {
  return {
    startState: function () {
      return {
        lineNumber: 0,
        tableHeaderLine: false,
        allowFeature: true,
        allowBackground: false,
        allowScenario: false,
        allowSteps: false,
        allowPlaceholders: false,
        allowMultilineArgument: false,
        inMultilineString: false,
        inMultilineTable: false,
        inKeywordLine: false
      };
    },
    token: function (stream, state) {
      if (stream.sol()) {
        state.lineNumber++;
        state.inKeywordLine = false;
        if (state.inMultilineTable) {
            state.tableHeaderLine = false;
            if (!stream.match(/\s*\|/, false)) {
              state.allowMultilineArgument = false;
              state.inMultilineTable = false;
            }
        }
      }

      stream.eatSpace();

      if (state.allowMultilineArgument) {

        // STRING
        if (state.inMultilineString) {
          if (stream.match('"""')) {
            state.inMultilineString = false;
            state.allowMultilineArgument = false;
          } else {
            stream.match(/.*/);
          }
          return "string";
        }

        // TABLE
        if (state.inMultilineTable) {
          if (stream.match(/\|\s*/)) {
            return "bracket";
          } else {
            stream.match(/[^\|]*/);
            return state.tableHeaderLine ? "header" : "string";
          }
        }

        // DETECT START
        if (stream.match('"""')) {
          // String
          state.inMultilineString = true;
          return "string";
        } else if (stream.match("|")) {
          // Table
          state.inMultilineTable = true;
          state.tableHeaderLine = true;
          return "bracket";
        }

      }

      // LINE COMMENT
      if (stream.match(/#.*/)) {
        return "comment";

      // TAG
      } else if (!state.inKeywordLine && stream.match(/@\S+/)) {
        return "tag";

      // FEATURE
      } else if (!state.inKeywordLine && state.allowFeature && stream.match(/(æ©Ÿèƒ½|åŠŸèƒ½|ãƒ•ã‚£ãƒ¼ãƒãƒ£|ê¸°ëŠ¥|à¹‚à¸„à¸£à¸‡à¸«à¸¥à¸±à¸|à¸„à¸§à¸²à¸¡à¸ªà¸²à¸¡à¸²à¸£à¸–|à¸„à¸§à¸²à¸¡à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸—à¸²à¸‡à¸˜à¸¸à¸£à¸à¸´à¸ˆ|à²¹à³†à²šà³à²šà²³|à°—à±à°£à°®à±|à¨®à©à¨¹à¨¾à¨‚à¨¦à¨°à¨¾|à¨¨à¨•à¨¶ à¨¨à©à¨¹à¨¾à¨°|à¨–à¨¾à¨¸à©€à¨…à¨¤|à¤°à¥‚à¤ª à¤²à¥‡à¤–|ÙˆÙÛŒÚ˜Ú¯ÛŒ|Ø®Ø§ØµÙŠØ©|×ª×›×•× ×”|Ð¤ÑƒÐ½ÐºÑ†Ñ–Ð¾Ð½Ð°Ð»|Ð¤ÑƒÐ½ÐºÑ†Ð¸Ñ|Ð¤ÑƒÐ½ÐºÑ†Ð¸Ð¾Ð½Ð°Ð»Ð½Ð¾ÑÑ‚|Ð¤ÑƒÐ½ÐºÑ†Ð¸Ð¾Ð½Ð°Ð»|Ò®Ð·ÐµÐ½Ñ‡Ó™Ð»ÐµÐºÐ»ÐµÐ»ÐµÐº|Ð¡Ð²Ð¾Ð¹ÑÑ‚Ð²Ð¾|ÐžÑÐ¾Ð±Ð¸Ð½Ð°|ÐœÓ©Ð¼ÐºÐ¸Ð½Ð»ÐµÐº|ÐœÐ¾Ð³ÑƒÑ›Ð½Ð¾ÑÑ‚|Î›ÎµÎ¹Ï„Î¿Ï…ÏÎ³Î¯Î±|Î”Ï…Î½Î±Ï„ÏŒÏ„Î·Ï„Î±|WÅ‚aÅ›ciwoÅ›Ä‡|VlastnosÅ¥|Trajto|TÃ­nh nÄƒng|SavybÄ—|Pretty much|PoÅ¾iadavka|PoÅ¾adavek|Potrzeba biznesowa|Ã–zellik|Osobina|Ominaisuus|Omadus|OH HAI|MoguÄ‡nost|Mogucnost|JellemzÅ‘|HwÃ¦t|Hwaet|FunzionalitÃ |FunktionalitÃ©it|FunktionalitÃ¤t|Funkcja|Funkcionalnost|FunkcionalitÄte|Funkcia|Fungsi|Functionaliteit|FuncÈ›ionalitate|FuncÅ£ionalitate|Functionalitate|Funcionalitat|Funcionalidade|FonctionnalitÃ©|Fitur|FÄ«Äa|Feature|Eiginleiki|Egenskap|Egenskab|CaracterÃ­stica|Caracteristica|Business Need|Aspekt|Arwedd|Ahoy matey!|Ability):/)) {
        state.allowScenario = true;
        state.allowBackground = true;
        state.allowPlaceholders = false;
        state.allowSteps = false;
        state.allowMultilineArgument = false;
        state.inKeywordLine = true;
        return "keyword";

      // BACKGROUND
      } else if (!state.inKeywordLine && state.allowBackground && stream.match(/(èƒŒæ™¯|ë°°ê²½|à¹à¸™à¸§à¸„à¸´à¸”|à²¹à²¿à²¨à³à²¨à³†à²²à³†|à°¨à±‡à°ªà°¥à±à°¯à°‚|à¨ªà¨¿à¨›à©‹à¨•à©œ|à¤ªà¥ƒà¤·à¥à¤ à¤­à¥‚à¤®à¤¿|Ø²Ù…ÛŒÙ†Ù‡|Ø§Ù„Ø®Ù„ÙÙŠØ©|×¨×§×¢|Ð¢Ð°Ñ€Ð¸Ñ…|ÐŸÑ€ÐµÐ´Ñ‹ÑÑ‚Ð¾Ñ€Ð¸Ñ|ÐŸÑ€ÐµÐ´Ð¸ÑÑ‚Ð¾Ñ€Ð¸Ñ|ÐŸÐ¾Ð·Ð°Ð´Ð¸Ð½Ð°|ÐŸÐµÑ€ÐµÐ´ÑƒÐ¼Ð¾Ð²Ð°|ÐžÑÐ½Ð¾Ð²Ð°|ÐšÐ¾Ð½Ñ‚ÐµÐºÑÑ‚|ÐšÐµÑ€ÐµÑˆ|Î¥Ï€ÏŒÎ²Î±Î¸ÏÎ¿|ZaÅ‚oÅ¼enia|Yo\-ho\-ho|Tausta|Taust|SituÄcija|Rerefons|Pozadina|Pozadie|PozadÃ­|Osnova|Latar Belakang|Kontext|Konteksts|Kontekstas|Kontekst|HÃ¡ttÃ©r|Hannergrond|Grundlage|GeÃ§miÅŸ|Fundo|Fono|First off|Dis is what went down|Dasar|Contexto|Contexte|Context|Contesto|CenÃ¡rio de Fundo|Cenario de Fundo|Cefndir|Bá»‘i cáº£nh|Bakgrunnur|Bakgrunn|Bakgrund|Baggrund|Background|B4|Antecedents|Antecedentes|Ã†r|Aer|Achtergrond):/)) {
        state.allowPlaceholders = false;
        state.allowSteps = true;
        state.allowBackground = false;
        state.allowMultilineArgument = false;
        state.inKeywordLine = true;
        return "keyword";

      // SCENARIO OUTLINE
      } else if (!state.inKeywordLine && state.allowScenario && stream.match(/(å ´æ™¯å¤§ç¶±|åœºæ™¯å¤§çº²|åŠ‡æœ¬å¤§ç¶±|å‰§æœ¬å¤§çº²|ãƒ†ãƒ³ãƒ—ãƒ¬|ã‚·ãƒŠãƒªã‚ªãƒ†ãƒ³ãƒ—ãƒ¬ãƒ¼ãƒˆ|ã‚·ãƒŠãƒªã‚ªãƒ†ãƒ³ãƒ—ãƒ¬|ã‚·ãƒŠãƒªã‚ªã‚¢ã‚¦ãƒˆãƒ©ã‚¤ãƒ³|ì‹œë‚˜ë¦¬ì˜¤ ê°œìš”|à¸ªà¸£à¸¸à¸›à¹€à¸«à¸•à¸¸à¸à¸²à¸£à¸“à¹Œ|à¹‚à¸„à¸£à¸‡à¸ªà¸£à¹‰à¸²à¸‡à¸‚à¸­à¸‡à¹€à¸«à¸•à¸¸à¸à¸²à¸£à¸“à¹Œ|à²µà²¿à²µà²°à²£à³†|à°•à°¥à°¨à°‚|à¨ªà¨Ÿà¨•à¨¥à¨¾ à¨°à©‚à¨ª à¨°à©‡à¨–à¨¾|à¨ªà¨Ÿà¨•à¨¥à¨¾ à¨¢à¨¾à¨‚à¨šà¨¾|à¤ªà¤°à¤¿à¤¦à¥ƒà¤¶à¥à¤¯ à¤°à¥‚à¤ªà¤°à¥‡à¤–à¤¾|Ø³ÙŠÙ†Ø§Ø±ÙŠÙˆ Ù…Ø®Ø·Ø·|Ø§Ù„Ú¯ÙˆÛŒ Ø³Ù†Ø§Ø±ÛŒÙˆ|×ª×‘× ×™×ª ×ª×¨×—×™×©|Ð¡Ñ†ÐµÐ½Ð°Ñ€Ð¸Ð¹Ð½Ñ‹Ò£ Ñ‚Ó©Ð·ÐµÐ»ÐµÑˆÐµ|Ð¡Ñ†ÐµÐ½Ð°Ñ€Ð¸Ð¹ ÑÑ‚Ñ€ÑƒÐºÑ‚ÑƒÑ€Ð°ÑÐ¸|Ð¡Ñ‚Ñ€ÑƒÐºÑ‚ÑƒÑ€Ð° ÑÑ†ÐµÐ½Ð°Ñ€Ñ–ÑŽ|Ð¡Ñ‚Ñ€ÑƒÐºÑ‚ÑƒÑ€Ð° ÑÑ†ÐµÐ½Ð°Ñ€Ð¸Ñ|Ð¡Ñ‚Ñ€ÑƒÐºÑ‚ÑƒÑ€Ð° ÑÑ†ÐµÐ½Ð°Ñ€Ð¸Ñ˜Ð°|Ð¡ÐºÐ¸Ñ†Ð°|Ð Ð°Ð¼ÐºÐ° Ð½Ð° ÑÑ†ÐµÐ½Ð°Ñ€Ð¸Ð¹|ÐšÐ¾Ð½Ñ†ÐµÐ¿Ñ‚|Î ÎµÏÎ¹Î³ÏÎ±Ï†Î® Î£ÎµÎ½Î±ÏÎ¯Î¿Ï…|Wharrimean is|Template Situai|Template Senario|Template Keadaan|Tapausaihio|Szenariogrundriss|Szablon scenariusza|Swa hwÃ¦r swa|Swa hwaer swa|Struktura scenarija|StructurÄƒ scenariu|Structura scenariu|Skica|Skenario konsep|Shiver me timbers|Senaryo taslaÄŸÄ±|Schema dello scenario|Scenariomall|Scenariomal|Scenario Template|Scenario Outline|Scenario Amlinellol|ScenÄrijs pÄ“c parauga|Scenarijaus Å¡ablonas|Reckon it's like|Raamstsenaarium|Plang vum Szenario|Plan du ScÃ©nario|Plan du scÃ©nario|Osnova scÃ©nÃ¡Å™e|Osnova ScenÃ¡ra|NÃ¡Ärt ScenÃ¡ru|NÃ¡Ärt ScÃ©nÃ¡Å™e|NÃ¡Ärt ScenÃ¡ra|MISHUN SRSLY|Menggariskan Senario|LÃ½sing DÃ¦ma|LÃ½sing AtburÃ°arÃ¡sar|Konturo de la scenaro|Koncept|Khung tÃ¬nh huá»‘ng|Khung ká»‹ch báº£n|ForgatÃ³kÃ¶nyv vÃ¡zlat|Esquema do CenÃ¡rio|Esquema do Cenario|Esquema del escenario|Esquema de l'escenari|Esbozo do escenario|DelineaÃ§Ã£o do CenÃ¡rio|Delineacao do Cenario|All y'all|Abstrakt Scenario|Abstract Scenario):/)) {
        state.allowPlaceholders = true;
        state.allowSteps = true;
        state.allowMultilineArgument = false;
        state.inKeywordLine = true;
        return "keyword";

      // EXAMPLES
      } else if (state.allowScenario && stream.match(/(ä¾‹å­|ä¾‹|ã‚µãƒ³ãƒ—ãƒ«|ì˜ˆ|à¸Šà¸¸à¸”à¸‚à¸­à¸‡à¹€à¸«à¸•à¸¸à¸à¸²à¸£à¸“à¹Œ|à¸Šà¸¸à¸”à¸‚à¸­à¸‡à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡|à²‰à²¦à²¾à²¹à²°à²£à³†à²—à²³à³|à°‰à°¦à°¾à°¹à°°à°£à°²à±|à¨‰à¨¦à¨¾à¨¹à¨°à¨¨à¨¾à¨‚|à¤‰à¤¦à¤¾à¤¹à¤°à¤£|Ù†Ù…ÙˆÙ†Ù‡ Ù‡Ø§|Ø§Ù…Ø«Ù„Ø©|×“×•×’×ž××•×ª|Ò®Ñ€Ð½Ó™ÐºÐ»Ó™Ñ€|Ð¡Ñ†ÐµÐ½Ð°Ñ€Ð¸Ñ˜Ð¸|ÐŸÑ€Ð¸Ð¼ÐµÑ€Ñ‹|ÐŸÑ€Ð¸Ð¼ÐµÑ€Ð¸|ÐŸÑ€Ð¸ÐºÐ»Ð°Ð´Ð¸|ÐœÐ¸ÑÐ¾Ð»Ð»Ð°Ñ€|ÐœÐ¸ÑÐ°Ð»Ð»Ð°Ñ€|Î£ÎµÎ½Î¬ÏÎ¹Î±|Î Î±ÏÎ±Î´ÎµÎ¯Î³Î¼Î±Ï„Î±|You'll wanna|Voorbeelden|Variantai|Tapaukset|Se Ã¾e|Se the|Se Ã°e|Scenarios|Scenariji|Scenarijai|PrzykÅ‚ady|Primjeri|Primeri|PÅ™Ã­klady|PrÃ­klady|PiemÄ“ri|PÃ©ldÃ¡k|PavyzdÅ¾iai|Paraugs|Ã–rnekler|Juhtumid|Exemplos|Exemples|Exemple|Exempel|EXAMPLZ|Examples|Esempi|Enghreifftiau|Ekzemploj|Eksempler|Ejemplos|Dá»¯ liá»‡u|Dead men tell no tales|DÃ¦mi|Contoh|CenÃ¡rios|Cenarios|Beispiller|Beispiele|AtburÃ°arÃ¡sir):/)) {
        state.allowPlaceholders = false;
        state.allowSteps = true;
        state.allowBackground = false;
        state.allowMultilineArgument = true;
        return "keyword";

      // SCENARIO
      } else if (!state.inKeywordLine && state.allowScenario && stream.match(/(å ´æ™¯|åœºæ™¯|åŠ‡æœ¬|å‰§æœ¬|ã‚·ãƒŠãƒªã‚ª|ì‹œë‚˜ë¦¬ì˜¤|à¹€à¸«à¸•à¸¸à¸à¸²à¸£à¸“à¹Œ|à²•à²¥à²¾à²¸à²¾à²°à²¾à²‚à²¶|à°¸à°¨à±à°¨à°¿à°µà±‡à°¶à°‚|à¨ªà¨Ÿà¨•à¨¥à¨¾|à¤ªà¤°à¤¿à¤¦à¥ƒà¤¶à¥à¤¯|Ø³ÙŠÙ†Ø§Ø±ÙŠÙˆ|Ø³Ù†Ø§Ø±ÛŒÙˆ|×ª×¨×—×™×©|Ð¡Ñ†ÐµÐ½Ð°Ñ€Ñ–Ð¹|Ð¡Ñ†ÐµÐ½Ð°Ñ€Ð¸Ð¾|Ð¡Ñ†ÐµÐ½Ð°Ñ€Ð¸Ð¹|ÐŸÑ€Ð¸Ð¼ÐµÑ€|Î£ÎµÎ½Î¬ÏÎ¹Î¿|TÃ¬nh huá»‘ng|The thing of it is|Tapaus|Szenario|Swa|Stsenaarium|Skenario|Situai|Senaryo|Senario|Scenaro|Scenariusz|Scenariu|ScÃ©nario|Scenario|Scenarijus|ScenÄrijs|Scenarij|Scenarie|ScÃ©nÃ¡Å™|ScenÃ¡r|Primer|MISHUN|Ká»‹ch báº£n|Keadaan|Heave to|ForgatÃ³kÃ¶nyv|Escenario|Escenari|CenÃ¡rio|Cenario|Awww, look mate|AtburÃ°arÃ¡s):/)) {
        state.allowPlaceholders = false;
        state.allowSteps = true;
        state.allowBackground = false;
        state.allowMultilineArgument = false;
        state.inKeywordLine = true;
        return "keyword";

      // STEPS
      } else if (!state.inKeywordLine && state.allowSteps && stream.match(/(é‚£éº¼|é‚£ä¹ˆ|è€Œä¸”|ç•¶|å½“|å¹¶ä¸”|åŒæ™‚|åŒæ—¶|å‰æ|å‡è®¾|å‡è¨­|å‡å®š|å‡å¦‚|ä½†æ˜¯|ä½†ã—|ä¸¦ä¸”|ã‚‚ã—|ãªã‚‰ã°|ãŸã ã—|ã—ã‹ã—|ã‹ã¤|í•˜ì§€ë§Œ|ì¡°ê±´|ë¨¼ì €|ë§Œì¼|ë§Œì•½|ë‹¨|ê·¸ë¦¬ê³ |ê·¸ëŸ¬ë©´|à¹à¸¥à¸° |à¹€à¸¡à¸·à¹ˆà¸­ |à¹à¸•à¹ˆ |à¸”à¸±à¸‡à¸™à¸±à¹‰à¸™ |à¸à¸³à¸«à¸™à¸”à¹ƒà¸«à¹‰ |à²¸à³à²¥à²¿à²¤à²¿à²¯à²¨à³à²¨à³ |à²®à²¤à³à²¤à³ |à²¨à²¿à³•à²¡à²¿à²¦ |à²¨à²‚à²¤à²° |à²†à²¦à²°à³† |à°®à°°à°¿à°¯à± |à°šà±†à°ªà±à°ªà°¬à°¡à°¿à°¨à°¦à°¿ |à°•à°¾à°¨à°¿ |à°ˆ à°ªà°°à°¿à°¸à±à°¥à°¿à°¤à°¿à°²à±‹ |à°…à°ªà±à°ªà±à°¡à± |à¨ªà¨° |à¨¤à¨¦ |à¨œà©‡à¨•à¨° |à¨œà¨¿à¨µà©‡à¨‚ à¨•à¨¿ |à¨œà¨¦à©‹à¨‚ |à¨…à¨¤à©‡ |à¤¯à¤¦à¤¿ |à¤ªà¤°à¤¨à¥à¤¤à¥ |à¤ªà¤° |à¤¤à¤¬ |à¤¤à¤¦à¤¾ |à¤¤à¤¥à¤¾ |à¤œà¤¬ |à¤šà¥‚à¤‚à¤•à¤¿ |à¤•à¤¿à¤¨à¥à¤¤à¥ |à¤•à¤¦à¤¾ |à¤”à¤° |à¤…à¤—à¤° |Ùˆ |Ù‡Ù†Ú¯Ø§Ù…ÛŒ |Ù…ØªÙ‰ |Ù„ÙƒÙ† |Ø¹Ù†Ø¯Ù…Ø§ |Ø«Ù… |Ø¨ÙØ±Ø¶ |Ø¨Ø§ ÙØ±Ø¶ |Ø§Ù…Ø§ |Ø§Ø°Ø§Ù‹ |Ø¢Ù†Ú¯Ø§Ù‡ |×›××©×¨ |×•×’× |×‘×”×™× ×ª×Ÿ |××–×™ |××– |××‘×œ |Ð¯ÐºÑ‰Ð¾ |ÒºÓ™Ð¼ |Ð£Ð½Ð´Ð° |Ð¢Ð¾Ð´Ñ– |Ð¢Ð¾Ð³Ð´Ð° |Ð¢Ð¾ |Ð¢Ð°ÐºÐ¶Ðµ |Ð¢Ð° |ÐŸÑƒÑÑ‚ÑŒ |ÐŸÑ€Ð¸Ð¿ÑƒÑÑ‚Ð¸Ð¼Ð¾, Ñ‰Ð¾ |ÐŸÑ€Ð¸Ð¿ÑƒÑÑ‚Ð¸Ð¼Ð¾ |ÐžÐ½Ð´Ð° |ÐÐ¾ |ÐÐµÑ…Ð°Ð¹ |ÐÓ™Ñ‚Ð¸Ò—Ó™Ð´Ó™ |Ð›ÐµÐºÐ¸Ð½ |Ð›Ó™ÐºÐ¸Ð½ |ÐšÐ¾Ð»Ð¸ |ÐšÐ¾Ð³Ð´Ð° |ÐšÐ¾Ð³Ð°Ñ‚Ð¾ |ÐšÐ°Ð´Ð° |ÐšÐ°Ð´ |Ðš Ñ‚Ð¾Ð¼Ñƒ Ð¶Ðµ |Ð† |Ð˜ |Ð—Ð°Ð´Ð°Ñ‚Ð¾ |Ð—Ð°Ð´Ð°Ñ‚Ð¸ |Ð—Ð°Ð´Ð°Ñ‚Ðµ |Ð•ÑÐ»Ð¸ |Ð”Ð¾Ð¿ÑƒÑÑ‚Ð¸Ð¼ |Ð”Ð°Ð½Ð¾ |Ð”Ð°Ð´ÐµÐ½Ð¾ |Ð’Ó™ |Ð’Ð° |Ð‘Ð¸Ñ€Ð¾Ðº |Ó˜Ð¼Ð¼Ð° |Ó˜Ð¹Ñ‚Ð¸Ðº |Ó˜Ð³Ó™Ñ€ |ÐÐ¼Ð¼Ð¾ |ÐÐ»Ð¸ |ÐÐ»Ðµ |ÐÐ³Ð°Ñ€ |Ð Ñ‚Ð°ÐºÐ¾Ð¶ |Ð |Î¤ÏŒÏ„Îµ |ÎŒÏ„Î±Î½ |ÎšÎ±Î¹ |Î”ÎµÎ´Î¿Î¼Î­Î½Î¿Ï… |Î‘Î»Î»Î¬ |Ãžurh |Ãžegar |Ãža Ã¾e |ÃžÃ¡ |Ãža |Zatati |ZakÅ‚adajÄ…c |Zadato |Zadate |Zadano |Zadani |Zadan |Za pÅ™edpokladu |Za predpokladu |Youse know when youse got |Youse know like when |Yna |Yeah nah |Y'know |Y |Wun |Wtedy |When y'all |When |Wenn |WEN |wann |Ve |VÃ  |Und |Un |ugeholl |Too right |Thurh |ThÃ¬ |Then y'all |Then |Tha the |Tha |Tetapi |Tapi |Tak |Tada |Tad |Stel |Soit |Siis |È˜i |Åži |Si |Sed |Se |SÃ¥ |Quando |Quand |Quan |Pryd |Potom |Pokud |PokiaÄ¾ |PerÃ² |Pero |Pak |Oraz |Onda |Ond |Oletetaan |Og |Och |O zaman |Niin |NhÆ°ng |NÃ¤r |NÃ¥r |Mutta |Men |Mas |Maka |Majd |MajÄ…c |Mais |Maar |mÃ¤ |Ma |Lorsque |Lorsqu'|Logo |Let go and haul |Kun |Kuid |Kui |Kiedy |Khi |Ketika |Kemudian |KeÄ |KdyÅ¾ |Kaj |Kai |Kada |Kad |JeÅ¼eli |JeÅ›li |Ja |It's just unbelievable |Ir |I CAN HAZ |I |Ha |Givun |Givet |Given y'all |Given |Gitt |Gegeven |Gegeben seien |Gegeben sei |Gdy |Gangway! |Fakat |Ã‰tant donnÃ©s |Etant donnÃ©s |Ã‰tant donnÃ©es |Etant donnÃ©es |Ã‰tant donnÃ©e |Etant donnÃ©e |Ã‰tant donnÃ© |Etant donnÃ© |Et |Ã‰s |Entonces |EntÃ³n |EntÃ£o |Entao |En |EÄŸer ki |Ef |Eeldades |E |Ãurh |Duota |Dun |DonitaÄµo |Donat |Donada |Do |Diyelim ki |Diberi |Dengan |Den youse gotta |DEN |De |Dato |DaÈ›i fiind |DaÅ£i fiind |Dati fiind |Dati |Date fiind |Date |Data |Dat fiind |Dar |Dann |dann |Dan |Dados |Dado |Dadas |Dada |Ãa Ã°e |Ãa |Cuando |Cho |Cando |CÃ¢nd |Cand |Cal |But y'all |But at the end of the day I reckon |BUT |But |Buh |Blimey! |Biáº¿t |Bet |Bagi |Aye |awer |Avast! |Atunci |Atesa |AtÃ¨s |Apabila |Anrhegedig a |Angenommen |And y'all |And |AN |An |an |Amikor |Amennyiben |Ama |Als |Alors |Allora |Ali |Aleshores |Ale |Akkor |Ak |Adott |Ac |Aber |A zÃ¡roveÅˆ |A tieÅ¾ |A taktieÅ¾ |A takÃ© |A |a |7 |\* )/)) {
        state.inStep = true;
        state.allowPlaceholders = true;
        state.allowMultilineArgument = true;
        state.inKeywordLine = true;
        return "keyword";

      // INLINE STRING
      } else if (stream.match(/"[^"]*"?/)) {
        return "string";

      // PLACEHOLDER
      } else if (state.allowPlaceholders && stream.match(/<[^>]*>?/)) {
        return "variable";

      // Fall through
      } else {
        stream.next();
        stream.eatWhile(/[^@"<#]/);
        return null;
      }
    }
  };
});

CodeMirror.defineMIME("text/x-feature", "gherkin");

});
