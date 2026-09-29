/**
 * =============================================================================
 * CHINNODU FOODS — AI VOICE CONCIERGE, NLP ENGINE & ML RECOMMENDATIONS
 * =============================================================================
 * Features:
 * 1. Web Speech Recognition (STT) + Web Speech Synthesis (TTS) with Indian/Telugu accents
 * 2. Real-time Natural Language Processing (NLP) Entity Extraction & Intent Classification
 * 3. 100% Alignment with Chinnodu Foods' 25 Authentic Homemade Delicacies
 * 4. Machine Learning (ML) Taste Profile & Synergy Vector Recommendation Engine
 * 5. Compact, Non-Intrusive Floating Draggable Voice AI Bar (Safe on Mobile & Desktop)
 * =============================================================================
 */

(function () {
  'use strict';

  // Voice Assistant State
  const VOICE_STATE = {
    isListening: false,
    isSpeaking: false,
    speechEnabled: true,
    recognition: null,
    synth: window.speechSynthesis || null,
    selectedVoice: null,
    userTasteVector: [0.5, 0.5, 0.5, 0.5, 0.5] // [sweet, spicy, tangy, crispy, ghee]
  };

  // ---------------------------------------------------------------------------
  // 1. CHINNODU FOODS DELICACIES DIRECTORY (Exact 25 Catalog Delicacies)
  // ---------------------------------------------------------------------------
  const CHINNODU_CATALOG = [
    { id: 'putta-mati', name: 'Putta mati', telugu: 'పుట్ట మట్టి', category: 'pickles', categoryLabel: 'Homemade Pickles', weights: { '250g': 220, '500g': 420, '1kg': 799 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Speciality' },
    { id: 'bellam-sunnunda', name: 'Bellam Sunnunda', telugu: 'బెల్లం సున్నుండ', category: 'sweets', categoryLabel: 'Traditional Sweets', weights: { '250g': 180, '500g': 350, '1kg': 680 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Bestseller' },
    { id: 'ragi-laddu', name: 'Ragi Laddu', telugu: 'రాగి లడ్డు', category: 'sweets', categoryLabel: 'Traditional Sweets', weights: { '250g': 160, '500g': 310, '1kg': 600 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Healthy Superfood' },
    { id: 'nuvvulu-laddu', name: 'Nuvvulu Laddu (Sesame)', telugu: 'నువ్వుల లడ్డు (చిమ్మిలి)', category: 'sweets', categoryLabel: 'Traditional Sweets', weights: { '250g': 150, '500g': 290, '1kg': 560 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Iron Rich' },
    { id: 'kajjikayalu', name: 'Kajjikayalu', telugu: 'కజ్జికాయలు (కొబ్బరి-నువ్వులు)', category: 'sweets', categoryLabel: 'Traditional Sweets', weights: { '250g': 170, '500g': 330, '1kg': 640 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Crispy Sweet' },
    { id: 'gorumitilu', name: 'Gorumitilu', telugu: 'గోరుమిటీలు', category: 'sweets', categoryLabel: 'Traditional Sweets', weights: { '250g': 140, '500g': 270, '1kg': 520 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Traditional' },
    { id: 'rava-laddu', name: 'Rava Laddu', telugu: 'రవ్వ లడ్డు', category: 'sweets', categoryLabel: 'Traditional Sweets', weights: { '250g': 150, '500g': 290, '1kg': 560 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Pure Ghee' },
    { id: 'kobbari-laddu', name: 'Kobbari Laddu', telugu: 'కొబ్బరి లడ్డు', category: 'sweets', categoryLabel: 'Traditional Sweets', weights: { '250g': 150, '500g': 290, '1kg': 560 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Fresh Coconut' },
    { id: 'ghee-arisalu', name: 'Ghee Arisalu', telugu: 'స్వచ్ఛమైన నెయ్యి అరిసెలు', category: 'sweets', categoryLabel: 'Traditional Sweets', weights: { '250g': 190, '500g': 370, '1kg': 720 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Festival King' },
    { id: 'ghee-nuvvula-arisalu', name: 'Ghee Nuvvula Arisalu', telugu: 'నెయ్యి నువ్వుల అరిసెలు', category: 'sweets', categoryLabel: 'Traditional Sweets', weights: { '250g': 200, '500g': 390, '1kg': 760 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Sesame Crusted' },
    { id: 'bellam-mithai-laddu', name: 'Bellam Mithai Laddu (Boondi Laddu)', telugu: 'బెల్లం బూందీ మిఠాయి లడ్డు', category: 'sweets', categoryLabel: 'Traditional Sweets', weights: { '250g': 160, '500g': 310, '1kg': 600 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Village Mela' },
    { id: 'challa-guthulu', name: 'Challa Guthulu (Rose Cookies)', telugu: 'చల్లా గుత్తులు (గులాబీ పువ్వులు)', category: 'savouries', categoryLabel: 'Crispy Savouries', weights: { '250g': 140, '500g': 270, '1kg': 520 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Delicate Crunch' },
    { id: 'beetroot-janthikalu', name: 'Beetroot Janthikalu', telugu: 'బీట్‌రూట్ జంతికలు (మురుకులు)', category: 'savouries', categoryLabel: 'Crispy Savouries', weights: { '250g': 140, '500g': 270, '1kg': 520 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Natural Color' },
    { id: 'janthikalu', name: 'Traditional Janthikalu (Murukku)', telugu: 'సంప్రదాయ జంతికలు', category: 'savouries', categoryLabel: 'Crispy Savouries', weights: { '250g': 130, '500g': 250, '1kg': 480 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Godavari Classic' },
    { id: 'ragi-chakralu', name: 'Ragi Chakralu (Finger Millet Murukku)', telugu: 'రాగి చక్రాలు (మిల్లెట్ మురుకులు)', category: 'savouries', categoryLabel: 'Crispy Savouries', weights: { '250g': 140, '500g': 270, '1kg': 520 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'High Fiber' },
    { id: 'chegodilu', name: 'Godavari Chegodilu', telugu: 'గోదావరి చెగోడీలు', category: 'savouries', categoryLabel: 'Crispy Savouries', weights: { '250g': 140, '500g': 270, '1kg': 520 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Crunchy Rings' },
    { id: 'karam-gavvalu', name: 'Karam Gavvalu (Spicy Shells)', telugu: 'కారం గవ్వలు', category: 'savouries', categoryLabel: 'Crispy Savouries', weights: { '250g': 140, '500g': 270, '1kg': 520 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Handmade' },
    { id: 'saggubiyyam-chekkalu', name: 'Saggubiyyam Chekkalu (Sabudana Crisps)', telugu: 'సగ్గుబియ్యం చెక్కలు', category: 'savouries', categoryLabel: 'Crispy Savouries', weights: { '250g': 140, '500g': 270, '1kg': 520 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Evening Snack' },
    { id: 'spicy-boondhi', name: 'Spicy Boondhi (Kara Boondi)', telugu: 'కారపు బూందీ (వెల్లుల్లి-జీడిపప్పు)', category: 'savouries', categoryLabel: 'Crispy Savouries', weights: { '250g': 140, '500g': 270, '1kg': 520 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Garlic & Cashew' },
    { id: 'gothum-pendi-cheppes', name: 'Gothum Pendi Cheppes (Wheat Chekkalu)', telugu: 'గోధుమ పిండి చెక్కలు (చేప్పెస్)', category: 'savouries', categoryLabel: 'Crispy Savouries', weights: { '250g': 130, '500g': 250, '1kg': 480 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Whole Wheat' },
    { id: 'gongura-pickle', name: 'Andhra Special Gongura Pickle', telugu: 'ఆంధ్రా స్పెషల్ గోంగూర పచ్చడి', category: 'pickles', categoryLabel: 'Homemade Pickles', weights: { '250g': 140, '500g': 270, '1kg': 520 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Andhra Mata' },
    { id: 'tomata-pickle', name: 'Country Tomata Pickle (Tomato Nilva Pachadi)', telugu: 'నాటు టమాటా నిల్వ పచ్చడి', category: 'pickles', categoryLabel: 'Homemade Pickles', weights: { '250g': 130, '500g': 250, '1kg': 480 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Sun Dried Farm' },
    { id: 'mango-thandra-bellam', name: 'Mango Thandra Bellam (Jaggery Aam Papad)', telugu: 'మామిడి తాండ్ర (ఆర్గానిక్ బెల్లం)', category: 'tandra', categoryLabel: 'Authentic Tandra', weights: { '250g': 150, '500g': 290, '1kg': 560 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Sun Dried Jaggery' },
    { id: 'mango-thandra-sugar', name: 'Mango Thandra Sugar (Classic Aam Papad)', telugu: 'మామిడి తాండ్ర (పంచదార)', category: 'tandra', categoryLabel: 'Authentic Tandra', weights: { '250g': 140, '500g': 270, '1kg': 520 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Golden Mango' },
    { id: 'tati-thandra', name: 'Tati Thandra (Traditional Palm Fruit Tandra)', telugu: 'సాంప్రదాయ తాటి తాండ్ర', category: 'tandra', categoryLabel: 'Authentic Tandra', weights: { '250g': 160, '500g': 310, '1kg': 600 }, defaultWeight: '500g', diet: 'Pure Vegetarian', tag: 'Rare Godavari' }
  ];

  // ---------------------------------------------------------------------------
  // 2. MACHINE LEARNING (ML) TASTE & SYNERGY VECTORS
  // ---------------------------------------------------------------------------
  const ML_EMBEDDINGS = {
    // [Sweetness, Spiciness, Tanginess, Crispiness, GheeRichness]
    'putta-mati': [0.10, 0.40, 0.10, 0.30, 0.30],
    'bellam-sunnunda': [0.95, 0.00, 0.00, 0.20, 0.95],
    'ragi-laddu': [0.85, 0.00, 0.00, 0.15, 0.85],
    'nuvvulu-laddu': [0.90, 0.00, 0.00, 0.30, 0.75],
    'kajjikayalu': [0.85, 0.00, 0.00, 0.85, 0.65],
    'gorumitilu': [0.85, 0.00, 0.00, 0.75, 0.50],
    'rava-laddu': [0.90, 0.00, 0.00, 0.20, 0.80],
    'kobbari-laddu': [0.90, 0.00, 0.00, 0.20, 0.70],
    'ghee-arisalu': [0.95, 0.00, 0.00, 0.40, 0.95],
    'ghee-nuvvula-arisalu': [0.95, 0.00, 0.00, 0.50, 0.95],
    'bellam-mithai-laddu': [0.95, 0.00, 0.00, 0.25, 0.85],
    'challa-guthulu': [0.30, 0.00, 0.00, 0.95, 0.30],
    'beetroot-janthikalu': [0.10, 0.60, 0.00, 0.95, 0.40],
    'janthikalu': [0.00, 0.60, 0.00, 0.95, 0.40],
    'ragi-chakralu': [0.00, 0.60, 0.00, 0.95, 0.35],
    'chegodilu': [0.00, 0.70, 0.05, 0.95, 0.40],
    'karam-gavvalu': [0.00, 0.75, 0.00, 0.90, 0.30],
    'saggubiyyam-chekkalu': [0.00, 0.55, 0.00, 0.95, 0.30],
    'spicy-boondhi': [0.00, 0.75, 0.05, 0.95, 0.30],
    'gothum-pendi-cheppes': [0.00, 0.50, 0.00, 0.90, 0.25],
    'gongura-pickle': [0.00, 0.95, 0.95, 0.10, 0.20],
    'tomata-pickle': [0.00, 0.85, 0.90, 0.10, 0.20],
    'mango-thandra-bellam': [0.95, 0.00, 0.70, 0.20, 0.05],
    'mango-thandra-sugar': [0.95, 0.00, 0.65, 0.20, 0.05],
    'tati-thandra': [0.90, 0.00, 0.50, 0.25, 0.05]
  };

  const TRADITIONAL_SYNERGIES = {
    'sweets': ['chegodilu', 'janthikalu', 'spicy-boondhi', 'gongura-pickle'],
    'savouries': ['bellam-sunnunda', 'ghee-arisalu', 'kajjikayalu', 'mango-thandra-bellam'],
    'pickles': ['bellam-sunnunda', 'chegodilu', 'janthikalu', 'tati-thandra'],
    'tandra': ['bellam-sunnunda', 'chegodilu', 'ghee-arisalu']
  };

  class ChinnoduMLModel {
    static getActiveCatalog() {
      return (window.PRODUCTS_DATABASE && window.PRODUCTS_DATABASE.length > 0)
        ? window.PRODUCTS_DATABASE
        : CHINNODU_CATALOG;
    }

    static cosineSimilarity(vecA, vecB) {
      if (!vecA || !vecB) return 0.5;
      let dot = 0, normA = 0, normB = 0;
      for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
      }
      if (normA === 0 || normB === 0) return 0.5;
      return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    static getRecommendations(options = {}) {
      const catalog = ChinnoduMLModel.getActiveCatalog();
      const cartItems = (window.APP_STATE && window.APP_STATE.cart) ? window.APP_STATE.cart : [];
      const cartIds = cartItems.map(item => item.id);
      const targetCategory = options.category || null;

      const scored = catalog
        .filter(prod => !cartIds.includes(prod.id) && prod.inStock !== false)
        .map(prod => {
          let score = 0.58;
          let rationale = "Signature traditional Andhra recipe";
          const prodVec = ML_EMBEDDINGS[prod.id] || [0.5, 0.5, 0.5, 0.5, 0.5];

          // 1. Synergy matching with cart
          if (cartItems.length > 0) {
            for (const cItem of cartItems) {
              const cProd = catalog.find(p => p.id === cItem.id);
              if (!cProd) continue;
              const synergyList = TRADITIONAL_SYNERGIES[cProd.category] || [];
              if (synergyList.includes(prod.id)) {
                score += 0.35;
                rationale = `Classic Andhra Sweet-Savory Pairing with your ${cProd.name}`;
                break;
              } else if (cProd.category !== prod.category) {
                score += 0.15;
                rationale = `Complements your ${cProd.categoryLabel || 'cart selections'}`;
              }
            }
          }

          // 2. Cosine similarity with user taste profile
          const sim = ChinnoduMLModel.cosineSimilarity(VOICE_STATE.userTasteVector, prodVec);
          score += sim * 0.22;

          // 3. Category match boost if filtered
          if (targetCategory && prod.category === targetCategory) {
            score += 0.30;
          }

          const matchPercent = Math.min(99, Math.max(84, Math.round(score * 80 + (prod.rating || 4.9) * 3)));
          return { product: prod, matchScore: matchPercent, rationale };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 4);

      return scored;
    }
  }

  // ---------------------------------------------------------------------------
  // 3. ROBUST NATURAL LANGUAGE PROCESSING (NLP) & ENTITY MATCHER
  // ---------------------------------------------------------------------------
  const NLP_ALIASES = {
    // Sweets
    'sunnunda': 'bellam-sunnunda',
    'sunnundalu': 'bellam-sunnunda',
    'sununda': 'bellam-sunnunda',
    'bellam sunnunda': 'bellam-sunnunda',
    'urad dal laddu': 'bellam-sunnunda',
    'minapa sunnunda': 'bellam-sunnunda',
    
    'arisalu': 'ghee-arisalu',
    'ariselu': 'ghee-arisalu',
    'ghee arisalu': 'ghee-arisalu',
    'bellam arisalu': 'ghee-arisalu',
    'neyyi arisalu': 'ghee-arisalu',

    'nuvvula arisalu': 'ghee-nuvvula-arisalu',
    'nuvvulu arisalu': 'ghee-nuvvula-arisalu',
    'sesame arisalu': 'ghee-nuvvula-arisalu',
    
    'ragi laddu': 'ragi-laddu',
    'millet laddu': 'ragi-laddu',
    'ragi': 'ragi-laddu',

    'nuvvulu laddu': 'nuvvulu-laddu',
    'nuvvula laddu': 'nuvvulu-laddu',
    'chimmili': 'nuvvulu-laddu',
    'sesame laddu': 'nuvvulu-laddu',
    'til laddu': 'nuvvulu-laddu',

    'kajjikayalu': 'kajjikayalu',
    'kajjikaya': 'kajjikayalu',
    'garjalu': 'kajjikayalu',
    'karanji': 'kajjikayalu',

    'gorumitilu': 'gorumitilu',
    'gorumiti': 'gorumitilu',

    'rava laddu': 'rava-laddu',
    'suji laddu': 'rava-laddu',
    'sooji laddu': 'rava-laddu',

    'kobbari laddu': 'kobbari-laddu',
    'coconut laddu': 'kobbari-laddu',
    'nariyal laddu': 'kobbari-laddu',

    'bellam mithai laddu': 'bellam-mithai-laddu',
    'mithai laddu': 'bellam-mithai-laddu',
    'boondi laddu': 'bellam-mithai-laddu',

    // Savouries & Snacks
    'chegodilu': 'chegodilu',
    'chegodi': 'chegodilu',
    'ring murukku': 'chegodilu',
    'ring muruku': 'chegodilu',
    'godavari chegodilu': 'chegodilu',

    'janthikalu': 'janthikalu',
    'jantikalu': 'janthikalu',
    'murukulu': 'janthikalu',
    'murukku': 'janthikalu',
    'chakli': 'janthikalu',

    'beetroot janthikalu': 'beetroot-janthikalu',
    'beetroot murukku': 'beetroot-janthikalu',
    'beetroot chakli': 'beetroot-janthikalu',

    'ragi chakralu': 'ragi-chakralu',
    'ragi murukku': 'ragi-chakralu',
    'finger millet murukku': 'ragi-chakralu',

    'saggubiyyam chekkalu': 'saggubiyyam-chekkalu',
    'sabudana chekkalu': 'saggubiyyam-chekkalu',
    'chekkalu': 'saggubiyyam-chekkalu',

    'challa guthulu': 'challa-guthulu',
    'rose cookies': 'challa-guthulu',
    'gulabi puvvulu': 'challa-guthulu',

    'karam gavvalu': 'karam-gavvalu',
    'spicy gavvalu': 'karam-gavvalu',
    'gavvalu': 'karam-gavvalu',

    'spicy boondhi': 'spicy-boondhi',
    'kara boondi': 'spicy-boondhi',
    'karam boondi': 'spicy-boondhi',
    'boondi': 'spicy-boondhi',
    'boondhi': 'spicy-boondhi',

    'gothum pendi cheppes': 'gothum-pendi-cheppes',
    'wheat chekkalu': 'gothum-pendi-cheppes',
    'cheppes': 'gothum-pendi-cheppes',

    // Pickles
    'putta mati': 'putta-mati',
    'puttamati': 'putta-mati',
    'putta matti': 'putta-mati',

    'gongura': 'gongura-pickle',
    'gongura pickle': 'gongura-pickle',
    'gongura pachadi': 'gongura-pickle',

    'tomato pickle': 'tomata-pickle',
    'tomata pickle': 'tomata-pickle',
    'tomato pachadi': 'tomata-pickle',
    'tomata nilva pachadi': 'tomata-pickle',

    // Tandra
    'mango thandra bellam': 'mango-thandra-bellam',
    'bellam thandra': 'mango-thandra-bellam',
    'bellam tandra': 'mango-thandra-bellam',
    'mamidi thandra bellam': 'mango-thandra-bellam',

    'mango thandra sugar': 'mango-thandra-sugar',
    'sugar thandra': 'mango-thandra-sugar',
    'sugar tandra': 'mango-thandra-sugar',
    'mamidi thandra sugar': 'mango-thandra-sugar',

    'tati thandra': 'tati-thandra',
    'taati thandra': 'tati-thandra',
    'palm fruit tandra': 'tati-thandra',
    'tati': 'tati-thandra'
  };

  class ChinnoduNLPEngine {
    static normalize(text) {
      if (!text || typeof text !== 'string') return '';
      return text
        .toLowerCase()
        .replace(/['".,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    static extractEntities(rawText) {
      const clean = ChinnoduNLPEngine.normalize(rawText);
      const catalog = ChinnoduMLModel.getActiveCatalog();

      // 1. Extract Weight Entity (Default: 500g)
      let weight = '500g';
      if (/250\s*g|quarter\s*kg|quarter\s*kilo|pav\s*kilo|chinna|quarter/i.test(clean)) weight = '250g';
      else if (/1\s*kg|one\s*kg|1\s*kilo|kilo|pedda|one\s*kilo/i.test(clean)) weight = '1kg';
      else if (/500\s*g|half\s*kg|half\s*kilo|ara\s*kilo|half/i.test(clean)) weight = '500g';

      // 2. Extract Quantity Entity
      let qty = 1;
      const qtyMatch = clean.match(/\b(\d+)\s*(packets?|boxes?|bottles?|jars?|nos?|pieces?|packs?)?\b/);
      if (qtyMatch && Number(qtyMatch[1]) > 0 && Number(qtyMatch[1]) <= 20) {
        qty = parseInt(qtyMatch[1], 10);
      } else if (/\btwo\b|\brendu\b/i.test(clean)) qty = 2;
      else if (/\bthree\b|\bmoodu\b/i.test(clean)) qty = 3;
      else if (/\bfour\b|\bnaalugu\b/i.test(clean)) qty = 4;
      else if (/\bfive\b|\baidu\b/i.test(clean)) qty = 5;

      // 3. Extract Price Filter
      let maxPrice = null;
      const priceMatch = clean.match(/(?:under|below|less than|within|lopala|dhara)\s*(?:rs|inr|₹)?\s*(\d+)/i);
      if (priceMatch && priceMatch[1]) {
        maxPrice = parseInt(priceMatch[1], 10);
      }

      // 4. Extract Category Entity
      let category = null;
      if (/\b(pickle|pickles|pachadi|pachallu|gongura|achar|nilva)\b/i.test(clean)) category = 'pickles';
      else if (/\b(sweet|sweets|mithai|laddu|sunnunda|arisalu|kajjikayalu|gorumitilu)\b/i.test(clean)) category = 'sweets';
      else if (/\b(savouries|savory|hot|snacks|snack|chegodilu|janthikalu|chakralu|boondi|gavvalu|chekkalu)\b/i.test(clean)) category = 'savouries';
      else if (/\b(tandra|thandra|aam papad|mamidi tandra|fruit jelly)\b/i.test(clean)) category = 'tandra';

      // 5. Match Product by Aliases or Direct Name
      let matchedProduct = null;
      for (const [alias, prodId] of Object.entries(NLP_ALIASES)) {
        if (clean.includes(alias)) {
          matchedProduct = catalog.find(p => p.id === prodId);
          if (matchedProduct) break;
        }
      }

      // Fallback fuzzy search on product names & telugu names
      if (!matchedProduct) {
        matchedProduct = catalog.find(p => {
          const name = p.name.toLowerCase();
          const tel = (p.telugu || '').toLowerCase();
          return clean.includes(name) || (tel && clean.includes(tel));
        });
      }

      return {
        matchedProduct,
        weight,
        qty,
        maxPrice,
        category,
        rawText: clean
      };
    }

    static classifyIntent(cleanText) {
      // 1. Live Order Tracking (Check first to avoid false-matching 'order' as add-to-cart)
      if (/\b(track|tracking|courier|dispatch|where.*order|order.*ekkada)\b/i.test(cleanText) || (/\bstatus\b/i.test(cleanText) && !/\bstock\b/i.test(cleanText))) {
        return 'INTENT_TRACK_ORDER';
      }

      // 2. Cart Operations
      if (/\b(clear cart|empty cart|remove all|cart theesi)\b/i.test(cleanText)) {
        return 'INTENT_CLEAR_CART';
      }
      if (/\b(view cart|show cart|my cart|open cart|basket|cart chupinchu)\b/i.test(cleanText) || /^cart$/i.test(cleanText)) {
        return 'INTENT_VIEW_CART';
      }
      if (/\b(checkout|place order|order now|upi|gpay|phonepe|paytm)\b/i.test(cleanText) || /\b(pay|payment)\b/i.test(cleanText)) {
        return 'INTENT_CHECKOUT';
      }

      // 4. Product Details / "What is X" (Prevents 'putta' matching 'put' add-to-cart)
      if (/^(what is|tell me about|explain|details of)\b/i.test(cleanText) || /\bwhat is (putta|sunnunda|arisalu|chegodilu|gongura|tandra|challa)\b/i.test(cleanText)) {
        return 'INTENT_PRODUCT_INFO';
      }

      // 5. Add to Cart (Checked BEFORE purity inquiry so 'Add Ghee Arisalu' is recognized as Add to Cart)
      if (/\b(add|buy|veseyyi|pettu|kavalenu|ivvandi|vesuko|bag lo|cart lo)\b/i.test(cleanText) ||
          (/\bput\b/i.test(cleanText) && !/\bputta\b/i.test(cleanText)) ||
          (/\border\b/i.test(cleanText) && !/\b(track|where|status)\b/i.test(cleanText))) {
        return 'INTENT_ADD_TO_CART';
      }

      // 6. Information, Purity & Contact Inquiries
      if (/\b(owner|founder|who.*are.*you|contact|phone|number|somesh|address|location|kitchen)\b/i.test(cleanText)) {
        return 'INTENT_CONTACT_INQUIRY';
      }
      if (/\b(delivery|shipping|charges|pincode|how.*many.*days|how.*long.*delivery)\b/i.test(cleanText)) {
        return 'INTENT_DELIVERY_INQUIRY';
      }
      if (/\b(ghee|oil|ingredients|preservative|preservatives|chemicals|cold pressed|wood pressed|pure veg|vegetarian)\b/i.test(cleanText)) {
        return 'INTENT_PURITY_INQUIRY';
      }

      // 7. Category Listings
      if (/\b(what sweets|show sweets|traditional sweets|mithai list)\b/i.test(cleanText) || (/\bsweets\b/i.test(cleanText) && /\b(show|list|menu|have|chupinchu)\b/i.test(cleanText))) {
        return 'INTENT_LIST_SWEETS';
      }
      if (/\b(what savouries|what snacks|show snacks|crispy|hot items|pindi vantalu)\b/i.test(cleanText) || (/\b(savouries|snacks)\b/i.test(cleanText) && /\b(show|list|menu|have|chupinchu)\b/i.test(cleanText))) {
        return 'INTENT_LIST_SAVOURIES';
      }
      if (/\b(what pickles|show pickles|pachadi list|pachallu)\b/i.test(cleanText) || (/\bpickles\b/i.test(cleanText) && /\b(show|list|menu|have|chupinchu)\b/i.test(cleanText))) {
        return 'INTENT_LIST_PICKLES';
      }
      if (/\b(what is tandra|show tandra|aam papad|mamidi tandra)\b/i.test(cleanText) || (/\btandra\b/i.test(cleanText) && /\b(show|list|menu|have|chupinchu)\b/i.test(cleanText))) {
        return 'INTENT_LIST_TANDRA';
      }

      // 7. Price Filter
      if (/(under|below|less than|budget|within)\s*\d+/i.test(cleanText)) {
        return 'INTENT_PRICE_FILTER';
      }

      // 8. ML Recommendations
      if (/\b(recommend|suggest|popular|bestseller|best sweet|best snack|special|pair)\b/i.test(cleanText)) {
        return 'INTENT_ML_RECOMMEND';
      }

      // 9. Search
      if (/\b(search|find|show|look for|chupinchu|unnaya|unda)\b/i.test(cleanText)) {
        return 'INTENT_SEARCH';
      }

      return 'INTENT_GENERAL_QUERY';
    }

    static processCommand(commandText) {
      const clean = ChinnoduNLPEngine.normalize(commandText);
      const intent = ChinnoduNLPEngine.classifyIntent(clean);
      const entities = ChinnoduNLPEngine.extractEntities(clean);
      return { intent, entities, cleanText: clean };
    }
  }

  // ---------------------------------------------------------------------------
  // 4. VOICE SPEECH SYNTHESIS & RECOGNITION CONTROLLER
  // ---------------------------------------------------------------------------
  class ChinnoduVoiceAI {
    static init() {
      // 1. Initialize Web Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
      if (SpeechRecognition) {
        VOICE_STATE.recognition = new SpeechRecognition();
        VOICE_STATE.recognition.continuous = false;
        VOICE_STATE.recognition.interimResults = true;
        VOICE_STATE.recognition.lang = 'en-IN'; // Optimized for Indian English & Telugu phonetics

        VOICE_STATE.recognition.onstart = () => {
          VOICE_STATE.isListening = true;
          ChinnoduVoiceAI.updateUIState('listening');
        };

        VOICE_STATE.recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const currentSpeech = finalTranscript || interimTranscript;
          if (currentSpeech) {
            ChinnoduVoiceAI.renderUserSpeechBubble(currentSpeech);
          }

          if (finalTranscript) {
            ChinnoduVoiceAI.handleVoiceInput(finalTranscript);
          }
        };

        VOICE_STATE.recognition.onerror = (event) => {
          if (event.error !== 'no-speech') {
            console.warn('[VOICE AI ERROR]', event.error);
          }
          ChinnoduVoiceAI.updateUIState('idle');
          if (event.error === 'not-allowed') {
            ChinnoduVoiceAI.renderAssistantResponse("Microphone permission was denied. Please allow microphone access or type your question below.");
          }
        };

        VOICE_STATE.recognition.onend = () => {
          VOICE_STATE.isListening = false;
          ChinnoduVoiceAI.updateUIState('idle');
        };
      }

      // 2. Initialize Voices
      if (VOICE_STATE.synth) {
        const loadVoices = () => {
          const voices = VOICE_STATE.synth.getVoices();
          VOICE_STATE.selectedVoice = voices.find(v => v.lang === 'en-IN') ||
            voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))) ||
            voices[0];
        };
        loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
          speechSynthesis.onvoiceschanged = loadVoices;
        }
      }

      // 3. Attach cart observers
      ChinnoduVoiceAI.attachCartObserver();

      // 4. Initialize Live Draggable Widget for the Voice AI Bar
      ChinnoduVoiceAI.initDraggableButton();
    }

    static initDraggableButton() {
      const btn = document.getElementById('floating-voice-ai-btn');
      if (!btn) return;

      let isDragging = false;
      let dragMoved = false;
      let startPointerX = 0;
      let startPointerY = 0;
      let startBtnLeft = 0;
      let startBtnTop = 0;
      let activePointerId = null;

      // Lock height to strictly prevent vertical stretching
      const isMobile = window.innerWidth <= 640;
      btn.style.height = isMobile ? '34px' : '38px';
      btn.style.maxHeight = isMobile ? '34px' : '38px';

      // 1. Wipe legacy position storage key to clear any old stretched coordinates
      try { localStorage.removeItem('chinnodu_voice_btn_pos'); } catch (_) {}

      // Restore position if sensible
      try {
        const saved = localStorage.getItem('chinnodu_voice_btn_pos_v2');
        if (saved && !isMobile) {
          const pos = JSON.parse(saved);
          const rect = btn.getBoundingClientRect();
          const maxX = window.innerWidth - (rect.width || 120) - 8;
          const maxY = window.innerHeight - (rect.height || 38) - 8;
          if (pos.x >= 8 && pos.x <= maxX && pos.y >= 8 && pos.y <= maxY) {
            btn.style.left = pos.x + 'px';
            btn.style.top = pos.y + 'px';
            btn.style.right = 'auto';
            btn.style.bottom = 'auto';
          }
        }
      } catch (err) {}

      // 2. Handle resize
      window.addEventListener('resize', () => {
        const onMobile = window.innerWidth <= 640;
        btn.style.height = onMobile ? '34px' : '38px';
        btn.style.maxHeight = onMobile ? '34px' : '38px';

        if (btn.style.left && btn.style.left !== 'auto') {
          const rect = btn.getBoundingClientRect();
          const maxX = window.innerWidth - rect.width - 8;
          const maxY = window.innerHeight - rect.height - 8;
          const curLeft = parseFloat(btn.style.left) || 0;
          const curTop = parseFloat(btn.style.top) || 0;
          btn.style.left = Math.max(8, Math.min(curLeft, maxX)) + 'px';
          btn.style.top = Math.max(8, Math.min(curTop, maxY)) + 'px';
        }
      });

      // 3. Pointer events for 60fps live dragging
      btn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        isDragging = true;
        dragMoved = false;
        startPointerX = e.clientX;
        startPointerY = e.clientY;
        activePointerId = e.pointerId;

        const rect = btn.getBoundingClientRect();
        startBtnLeft = rect.left;
        startBtnTop = rect.top;

        btn.style.left = rect.left + 'px';
        btn.style.top = rect.top + 'px';
        btn.style.right = 'auto';
        btn.style.bottom = 'auto';
        btn.style.height = (window.innerWidth <= 640 ? '34px' : '38px');
        btn.classList.add('is-dragging');

        try { btn.setPointerCapture(e.pointerId); } catch (_) {}
      });

      btn.addEventListener('pointermove', (e) => {
        if (!isDragging || e.pointerId !== activePointerId) return;

        const deltaX = e.clientX - startPointerX;
        const deltaY = e.clientY - startPointerY;

        if (Math.hypot(deltaX, deltaY) > 5) {
          dragMoved = true;
        }

        const rect = btn.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - 8;
        const maxY = window.innerHeight - rect.height - 8;

        let nextX = Math.max(8, Math.min(startBtnLeft + deltaX, maxX));
        let nextY = Math.max(8, Math.min(startBtnTop + deltaY, maxY));

        btn.style.left = nextX + 'px';
        btn.style.top = nextY + 'px';
        btn.style.bottom = 'auto';
      });

      const handlePointerUp = (e) => {
        if (!isDragging || (activePointerId !== null && e.pointerId !== activePointerId)) return;
        isDragging = false;
        activePointerId = null;
        btn.classList.remove('is-dragging');

        try {
          if (btn.hasPointerCapture(e.pointerId)) {
            btn.releasePointerCapture(e.pointerId);
          }
        } catch (_) {}

        if (dragMoved && window.innerWidth > 640) {
          try {
            const finalRect = btn.getBoundingClientRect();
            localStorage.setItem('chinnodu_voice_btn_pos_v2', JSON.stringify({
              x: Math.round(finalRect.left),
              y: Math.round(finalRect.top)
            }));
          } catch (_) {}
        }
      };

      btn.addEventListener('pointerup', handlePointerUp);
      btn.addEventListener('pointercancel', handlePointerUp);

      // 4. Click opens modal (suppressed if dragged)
      btn.addEventListener('click', (e) => {
        if (dragMoved) {
          e.preventDefault();
          e.stopPropagation();
          dragMoved = false;
          return false;
        }
        if (typeof window.openVoiceAssistantModal === 'function') {
          window.openVoiceAssistantModal();
        }
      }, true);
    }

    static speak(text) {
      if (!VOICE_STATE.synth || !VOICE_STATE.speechEnabled) return;

      try {
        VOICE_STATE.synth.cancel();
        const cleanText = text.replace(/[*_#•✦✅🍯🌿🥨🥭✨📍🛒💳⏳🚚🔍🤖]/g, '').trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        if (VOICE_STATE.selectedVoice) {
          utterance.voice = VOICE_STATE.selectedVoice;
        }
        utterance.rate = 1.02;
        utterance.pitch = 1.05;

        utterance.onstart = () => {
          VOICE_STATE.isSpeaking = true;
          ChinnoduVoiceAI.updateUIState('speaking');
        };
        utterance.onend = () => {
          VOICE_STATE.isSpeaking = false;
          ChinnoduVoiceAI.updateUIState('idle');
        };
        utterance.onerror = () => {
          VOICE_STATE.isSpeaking = false;
          ChinnoduVoiceAI.updateUIState('idle');
        };

        VOICE_STATE.synth.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }

    static handleVoiceInput(speechText) {
      ChinnoduVoiceAI.updateUIState('processing');
      const analysis = ChinnoduNLPEngine.processCommand(speechText);
      const { intent, entities, cleanText } = analysis;

      ChinnoduVoiceAI.renderNlpBadge(intent, entities);

      switch (intent) {
        case 'INTENT_ADD_TO_CART': {
          if (entities.matchedProduct) {
            const p = entities.matchedProduct;
            const weight = (p.weights && p.weights[entities.weight]) ? entities.weight : (p.defaultWeight || '500g');
            const qty = entities.qty || 1;

            if (typeof window.addToCart === 'function') {
              window.addToCart(p.id, weight, qty);
            }

            const response = `✅ Added <strong>${qty} pack of fresh ${p.name} (${weight})</strong> to your cart!<br><small>Total items in cart: ${window.APP_STATE?.cart?.length || 1}</small>`;
            ChinnoduVoiceAI.renderAssistantResponse(response, p);
            ChinnoduVoiceAI.speak(`Added ${qty} ${weight} of fresh ${p.name} to your cart!`);

            // Suggest complementary pairing
            setTimeout(() => {
              const mlRecs = ChinnoduMLModel.getRecommendations();
              if (mlRecs.length > 0) {
                const top = mlRecs[0];
                const pairingMsg = `🤖 <strong>Recommended Pairing</strong>: *${top.product.name}* (${top.matchScore}% Match). ${top.rationale}.`;
                ChinnoduVoiceAI.renderAssistantResponse(pairingMsg, top.product);
              }
            }, 1200);

          } else {
            const reply = "Which delicacy would you like to add? We have fresh Bellam Sunnunda, Ghee Arisalu, Gongura Pickle, Chegodilu, and Mango Thandra.";
            ChinnoduVoiceAI.renderAssistantResponse(reply);
            ChinnoduVoiceAI.speak(reply);
          }
          break;
        }

        case 'INTENT_VIEW_CART': {
          if (typeof window.openCartDrawer === 'function') {
            window.openCartDrawer();
          }
          const cartCount = window.APP_STATE?.cart?.length || 0;
          const totalAmt = document.getElementById('cart-total-preview')?.textContent || '₹0';
          const reply = `🛒 You have ${cartCount} delicacies in your cart totaling ${totalAmt}. Opening your cart drawer now!`;
          ChinnoduVoiceAI.renderAssistantResponse(reply);
          ChinnoduVoiceAI.speak(`Opening your cart with ${cartCount} items.`);
          break;
        }

        case 'INTENT_CLEAR_CART': {
          if (window.APP_STATE) {
            window.APP_STATE.cart = [];
            if (typeof window.saveCartToStorage === 'function') window.saveCartToStorage();
            if (typeof window.updateCartUI === 'function') window.updateCartUI();
          }
          const reply = "🗑️ Your cart has been cleared.";
          ChinnoduVoiceAI.renderAssistantResponse(reply);
          ChinnoduVoiceAI.speak("Your cart has been cleared.");
          break;
        }

        case 'INTENT_CHECKOUT': {
          if (typeof window.openCartDrawer === 'function') {
            window.openCartDrawer();
          }
          const reply = "💳 Proceeding to checkout! We accept 100% secure Prepaid UPI via PhonePe, Google Pay, and Paytm.";
          ChinnoduVoiceAI.renderAssistantResponse(reply);
          ChinnoduVoiceAI.speak("Proceeding to checkout with secure UPI.");
          break;
        }

        case 'INTENT_TRACK_ORDER': {
          if (typeof window.openTrackOrderModal === 'function') {
            window.openTrackOrderModal();
          }
          const reply = "📍 Opening live tracking! Enter your Order ID or phone number to check courier status.";
          ChinnoduVoiceAI.renderAssistantResponse(reply);
          ChinnoduVoiceAI.speak("Opening live order tracking portal.");
          break;
        }

        case 'INTENT_LIST_SWEETS': {
          ChinnoduVoiceAI.filterCatalogUI('sweets');
          const reply = "🍯 We make 10 authentic Andhra sweets with 100% pure cow ghee and organic bellam: Bellam Sunnunda, Ghee Arisalu, Ragi Laddu, Nuvvulu Laddu, Kajjikayalu, Kobbari Laddu, Rava Laddu, Gorumitilu, Ghee Nuvvula Arisalu, and Bellam Mithai Laddu. Showing them on your screen!";
          const sunnunda = CHINNODU_CATALOG.find(p => p.id === 'bellam-sunnunda');
          ChinnoduVoiceAI.renderAssistantResponse(reply, sunnunda);
          ChinnoduVoiceAI.speak("Showing our 10 traditional pure cow ghee sweets on your screen!");
          break;
        }

        case 'INTENT_LIST_SAVOURIES': {
          ChinnoduVoiceAI.filterCatalogUI('savouries');
          const reply = "🥨 We prepare 9 crispy Godavari snacks made fresh daily in wood-pressed oil: Godavari Chegodilu, Traditional Janthikalu, Beetroot Janthikalu, Ragi Chakralu, Saggubiyyam Chekkalu, Spicy Kara Boondhi, Karam Gavvalu, Challa Guthulu (Rose Cookies), and Gothum Pendi Cheppes.";
          const chegodilu = CHINNODU_CATALOG.find(p => p.id === 'chegodilu');
          ChinnoduVoiceAI.renderAssistantResponse(reply, chegodilu);
          ChinnoduVoiceAI.speak("Showing our 9 crispy Godavari savouries on your screen!");
          break;
        }

        case 'INTENT_LIST_PICKLES': {
          ChinnoduVoiceAI.filterCatalogUI('pickles');
          const reply = "🌿 Our homemade village pickles include: Andhra Special Gongura Pickle, Country Farm Tomata Nilva Pachadi, and Putta mati. All prepared with cold-pressed oil, zero preservatives, and aged naturally!";
          const gongura = CHINNODU_CATALOG.find(p => p.id === 'gongura-pickle');
          ChinnoduVoiceAI.renderAssistantResponse(reply, gongura);
          ChinnoduVoiceAI.speak("Showing our authentic homemade pickles on your screen!");
          break;
        }

        case 'INTENT_LIST_TANDRA': {
          ChinnoduVoiceAI.filterCatalogUI('tandra');
          const reply = "🥭 We have 3 rare sun-dried fruit tandras: Mango Thandra Bellam (with organic jaggery), Mango Thandra Sugar, and rare Traditional Tati Thandra (Palm fruit tandra)!";
          const tandra = CHINNODU_CATALOG.find(p => p.id === 'mango-thandra-bellam');
          ChinnoduVoiceAI.renderAssistantResponse(reply, tandra);
          ChinnoduVoiceAI.speak("Showing our authentic sun-dried fruit tandras!");
          break;
        }

        case 'INTENT_PURITY_INQUIRY': {
          const reply = "✨ **100% Purity Guarantee**: At Chinnodu Foods, all delicacies are 100% Pure Vegetarian. We strictly use pure cow ghee, organic bellam (jaggery), and cold wood-pressed oils. Zero preservatives, zero chemicals, and zero palm oil. Handcrafted with mother's love!";
          ChinnoduVoiceAI.renderAssistantResponse(reply);
          ChinnoduVoiceAI.speak("All our delicacies are pure vegetarian, made with pure cow ghee and zero preservatives.");
          break;
        }

        case 'INTENT_DELIVERY_INQUIRY': {
          const reply = "🚚 **All-India Delivery**: We ship across all pin codes in India in airtight packaging within 2 to 4 business days. Delivery is completely **FREE on orders above ₹999**, and nominal shipping from ₹40 applies on smaller orders.";
          ChinnoduVoiceAI.renderAssistantResponse(reply);
          ChinnoduVoiceAI.speak("We deliver across India in 2 to 4 days. Delivery is free on orders above 999 rupees.");
          break;
        }

        case 'INTENT_CONTACT_INQUIRY': {
          const reply = "🏺 **Chinnodu Foods** is founded with love by **Somesh Adigarla** in Andhra Pradesh.<br>📲 WhatsApp & Call: **+91 9676698427**<br>📧 Email: **someshadigarla@gmail.com**<br>We are happy to prepare custom batch orders for your family festivals!";
          ChinnoduVoiceAI.renderAssistantResponse(reply);
          ChinnoduVoiceAI.speak("Chinnodu Foods is founded by Somesh Adigarla. You can contact Somesh on WhatsApp at 9676698427.");
          break;
        }

        case 'INTENT_PRICE_FILTER': {
          const maxP = entities.maxPrice || 350;
          const matching = ChinnoduMLModel.getActiveCatalog().filter(p => {
            const minPrice = Math.min(...Object.values(p.weights));
            return minPrice <= maxP;
          });

          if (matching.length > 0) {
            ChinnoduVoiceAI.filterCatalogUI('', matching);
            const reply = `🔍 Found ${matching.length} authentic Andhra delicacies starting under ₹${maxP}! Showing them on your screen.`;
            ChinnoduVoiceAI.renderAssistantResponse(reply, matching[0]);
            ChinnoduVoiceAI.speak(`Found ${matching.length} delicacies under ${maxP} rupees. Showing them on your screen.`);
          } else {
            const reply = "Our traditional delicacies start from ₹130. Please try a higher price range.";
            ChinnoduVoiceAI.renderAssistantResponse(reply);
            ChinnoduVoiceAI.speak(reply);
          }
          break;
        }

        case 'INTENT_ML_RECOMMEND': {
          const mlRecs = ChinnoduMLModel.getRecommendations({ category: entities.category });
          if (mlRecs.length > 0) {
            const top = mlRecs[0];
            const reply = `🤖 **ML Taste Recommendation**: Based on our Andhra culinary matrix, our #1 recommendation is **${top.product.name}** (${top.matchScore}% Match) — *${top.rationale}*.`;
            ChinnoduVoiceAI.renderAssistantResponse(reply, top.product);
            ChinnoduVoiceAI.speak(`I recommend our signature ${top.product.name} with a ${top.matchScore} percent taste match!`);
          }
          break;
        }

        case 'INTENT_PRODUCT_INFO': {
          if (entities.matchedProduct) {
            const p = entities.matchedProduct;
            let info = `${p.name} is one of our authentic Andhra kitchen specialties, prepared with 100% pure ingredients!`;
            if (p.id === 'putta-mati') {
              info = "Putta mati is our rare, traditional heritage delicacy, prepared following sacred village recipes. Available in 250g, 500g, and 1kg packs.";
            } else if (p.id === 'bellam-sunnunda') {
              info = "Bellam Sunnunda is our signature sweet made with roasted black gram (urad dal), 100% pure cow ghee, and organic bellam. Rich in protein and calcium!";
            } else if (p.id === 'ghee-arisalu') {
              info = "Ghee Arisalu is the traditional Andhra festival sweet made with aged rice flour and organic jaggery syrup, gently cooked in pure cow ghee.";
            } else if (p.id === 'ghee-nuvvula-arisalu') {
              info = "Ghee Nuvvula Arisalu is our special festival arisalu crusted with fragrant sesame seeds for a delicious nutty crunch.";
            } else if (p.id === 'chegodilu') {
              info = "Godavari Chegodilu are crispy hollow rings prepared with moong dal, rice flour, cumin, and sesame seeds. A perfect evening tea-time snack!";
            } else if (p.id === 'janthikalu') {
              info = "Traditional Janthikalu (Murukku) are crispy spiral savouries made with aged rice flour, roasted gram, and aromatic ajwain.";
            } else if (p.id === 'gongura-pickle') {
              info = "Andhra Special Gongura Pickle is made with fresh red sorrel leaves, cold wood-pressed groundnut oil, garlic, and Guntur chillies.";
            } else if (p.id === 'tomata-pickle') {
              info = "Country Tomata Pickle is made with sun-dried country farm tomatoes, fenugreek, and mustard in pure cold-pressed oil with zero chemicals.";
            } else if (p.id.includes('thandra')) {
              info = `${p.name} is an authentic sun-dried fruit delicacy made from ripe mangoes or palm fruit without synthetic preservatives.`;
            } else if (p.id === 'challa-guthulu') {
              info = "Challa Guthulu (Rose Cookies) are delicate flower-shaped crispy treats with mild sweetness and festive crunch.";
            }

            const defaultW = p.defaultWeight || Object.keys(p.weights)[0];
            const defaultP = p.weights[defaultW];
            const reply = `🏺 <strong>${p.name}</strong> (${p.telugu || ''})<br>${info}<br><small>✦ Starting at ₹${defaultP} (${defaultW}) • 100% Pure Vegetarian</small>`;
            ChinnoduVoiceAI.renderAssistantResponse(reply, p);
            ChinnoduVoiceAI.speak(info);
          } else {
            const reply = "We prepare 25 authentic Andhra delicacies including Bellam Sunnunda, Ghee Arisalu, Godavari Chegodilu, and Gongura Pickle! Which one would you like to know about?";
            ChinnoduVoiceAI.renderAssistantResponse(reply);
            ChinnoduVoiceAI.speak(reply);
          }
          break;
        }

        case 'INTENT_SEARCH':
        default: {
          if (entities.matchedProduct) {
            const p = entities.matchedProduct;
            ChinnoduVoiceAI.filterCatalogUI(p.name);
            const reply = `✨ Found **${p.name}** (${p.telugu || ''})! Starting from ₹${p.weights['250g'] || Object.values(p.weights)[0]}. Handcrafted with pure ingredients. Would you like to add it?`;
            ChinnoduVoiceAI.renderAssistantResponse(reply, p);
            ChinnoduVoiceAI.speak(`Found ${p.name}. Would you like me to add it to your cart?`);
          } else {
            const query = cleanText.replace(/search|find|show|look for|chupinchu|unnaya|unda/gi, '').trim();
            ChinnoduVoiceAI.filterCatalogUI(query);
            const reply = `🔍 Searching our kitchen catalog for "${query || 'delicacies'}". Showing matching dishes below!`;
            ChinnoduVoiceAI.renderAssistantResponse(reply);
            ChinnoduVoiceAI.speak(`Searching our catalog for ${query || 'delicacies'}.`);
          }
          break;
        }
      }
    }

    static filterCatalogUI(query, explicitList = null) {
      const q = (query || '').toLowerCase().trim();
      if (['sweets', 'savouries', 'pickles', 'tandra', 'all'].includes(q)) {
        if (typeof window.filterCatalog === 'function') {
          window.filterCatalog(q);
        } else if (typeof window.filterCategory === 'function') {
          window.filterCategory(q);
        }
      } else {
        const searchInput = document.getElementById('header-search-input');
        if (searchInput && query) {
          searchInput.value = query;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const mobileInput = document.getElementById('mobile-search-pill-input');
        if (mobileInput && query) {
          mobileInput.value = query;
        }
      }

      const menuSec = document.getElementById('menu-catalog');
      if (menuSec) {
        menuSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    static updateUIState(state) {
      const micBtn = document.getElementById('btn-voice-mic-main');
      const statusText = document.getElementById('voice-status-text');
      const soundwaves = document.getElementById('voice-soundwaves');

      if (!micBtn || !statusText || !soundwaves) return;

      if (state === 'listening') {
        micBtn.classList.add('recording');
        soundwaves.classList.add('active');
        statusText.innerHTML = '<span style="color:#DC2626; font-weight:700;">● Listening...</span> Speak your food command now!';
      } else if (state === 'processing') {
        micBtn.classList.remove('recording');
        soundwaves.classList.remove('active');
        statusText.innerHTML = '<span style="color:#D97706; font-weight:700;">⚡ Processing NLP intent...</span>';
      } else if (state === 'speaking') {
        micBtn.classList.remove('recording');
        soundwaves.classList.add('active');
        statusText.innerHTML = '<span style="color:#059669; font-weight:700;">🔊 Assistant Speaking...</span>';
      } else {
        micBtn.classList.remove('recording');
        soundwaves.classList.remove('active');
        statusText.innerHTML = 'Ready • Tap microphone or speak...';
      }
    }

    static renderUserSpeechBubble(text) {
      const container = document.getElementById('voice-transcript-container');
      if (!container) return;

      let bubble = document.getElementById('user-live-bubble');
      if (!bubble) {
        bubble = document.createElement('div');
        bubble.id = 'user-live-bubble';
        bubble.className = 'voice-bubble user';
        container.appendChild(bubble);
      }
      bubble.textContent = `"${text}"`;
      container.scrollTop = container.scrollHeight;
    }

    static renderAssistantResponse(htmlText, quickAddProduct = null) {
      const container = document.getElementById('voice-transcript-container');
      if (!container) return;

      const liveUser = document.getElementById('user-live-bubble');
      if (liveUser) liveUser.id = '';

      const bubble = document.createElement('div');
      bubble.className = 'voice-bubble assistant';
      bubble.innerHTML = htmlText.replace(/\n/g, '<br>');

      if (quickAddProduct) {
        const defaultW = quickAddProduct.defaultWeight || Object.keys(quickAddProduct.weights)[0];
        const defaultP = quickAddProduct.weights[defaultW];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-voice-quick-add';
        btn.innerHTML = `⚡ Add ${quickAddProduct.name} (${defaultW} - ₹${defaultP})`;
        btn.onclick = () => {
          if (typeof window.addToCart === 'function') {
            window.addToCart(quickAddProduct.id, defaultW, 1);
            btn.innerHTML = `✅ Added to Cart!`;
            btn.disabled = true;
          }
        };
        bubble.appendChild(btn);
      }

      container.appendChild(bubble);
      container.scrollTop = container.scrollHeight;
    }

    static renderNlpBadge(intent, entities) {
      const chips = document.getElementById('voice-nlp-chips');
      if (!chips) return;

      chips.style.display = 'flex';
      const cleanIntent = intent.replace('INTENT_', '').toLowerCase().replace(/_/g, ' ');
      let entityText = '';
      if (entities.matchedProduct) entityText += ` • Delicacy: ${entities.matchedProduct.name}`;
      if (entities.weight) entityText += ` • ${entities.weight}`;
      if (entities.qty > 1) entityText += ` • Qty: ${entities.qty}`;

      chips.innerHTML = `
        <span class="nlp-badge-intent">Intent: <strong>${cleanIntent}</strong></span>
        <span class="nlp-badge-entity">${entityText || '• Semantic food match'}</span>
      `;
    }

    static attachCartObserver() {
      const originalUpdateCartUI = window.updateCartUI;
      window.updateCartUI = function () {
        if (typeof originalUpdateCartUI === 'function') {
          originalUpdateCartUI.apply(this, arguments);
        }
        ChinnoduVoiceAI.renderCartMlPairings();
      };

      setTimeout(() => {
        ChinnoduVoiceAI.renderCartMlPairings();
      }, 500);
    }

    static renderCartMlPairings() {
      const cartItems = (window.APP_STATE && window.APP_STATE.cart) ? window.APP_STATE.cart : [];
      let container = document.getElementById('cart-ml-recommendations');

      if (!container) {
        const cartFooter = document.getElementById('cart-drawer-footer');
        if (cartFooter && cartFooter.parentNode) {
          container = document.createElement('div');
          container.id = 'cart-ml-recommendations';
          container.className = 'cart-ml-recommendations-box';
          cartFooter.parentNode.insertBefore(container, cartFooter);
        }
      }

      if (!container) return;

      if (cartItems.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
      }

      const recommendations = ChinnoduMLModel.getRecommendations().slice(0, 2);
      if (recommendations.length === 0) {
        container.style.display = 'none';
        return;
      }

      container.style.display = 'block';
      container.innerHTML = `
        <div class="cart-ml-header">
          <span>🤖 <strong>ML Smart Taste Pairing</strong></span>
          <span class="ml-badge">AI Powered</span>
        </div>
        <div class="cart-ml-items-grid">
          ${recommendations.map(rec => {
            const p = rec.product;
            const w = p.defaultWeight || Object.keys(p.weights)[0];
            const price = p.weights[w];
            return `
              <div class="cart-ml-card">
                <img src="${p.image || 'assets/images/brand-logo.jpg'}" alt="${p.name}" class="cart-ml-thumb" onerror="this.src='assets/images/brand-logo.jpg'">
                <div class="cart-ml-info">
                  <div class="cart-ml-name">${p.name}</div>
                  <div class="cart-ml-rationale">${rec.rationale}</div>
                  <div class="cart-ml-price-row">
                    <span class="cart-ml-match">${rec.matchScore}% Match</span>
                    <strong class="cart-ml-price">₹${price}</strong>
                  </div>
                </div>
                <button type="button" class="btn-cart-ml-add" onclick="window.addToCart('${p.id}', '${w}', 1)" title="Add recommended pairing">
                  + Add
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }

  // ---------------------------------------------------------------------------
  // 5. GLOBAL BROWSER WINDOW EXPORTS & EVENT HANDLERS
  // ---------------------------------------------------------------------------
  window.openVoiceAssistantModal = function () {
    const overlay = document.getElementById('voice-ai-modal-overlay');
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (VOICE_STATE.recognition && !VOICE_STATE.isListening) {
        try { VOICE_STATE.recognition.start(); } catch (e) {}
      }
    }
  };

  window.closeVoiceAssistantModal = function () {
    const overlay = document.getElementById('voice-ai-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      if (VOICE_STATE.recognition && VOICE_STATE.isListening) {
        VOICE_STATE.recognition.stop();
      }
      if (VOICE_STATE.synth) {
        VOICE_STATE.synth.cancel();
      }
    }
  };

  window.handleVoiceOverlayClick = function (e) {
    if (e.target && e.target.id === 'voice-ai-modal-overlay') {
      window.closeVoiceAssistantModal();
    }
  };

  window.toggleSpeechRecognition = function () {
    if (!VOICE_STATE.recognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari, or type your question below.");
      return;
    }

    if (VOICE_STATE.isListening) {
      VOICE_STATE.recognition.stop();
    } else {
      try {
        VOICE_STATE.recognition.start();
      } catch (err) {
        VOICE_STATE.recognition.stop();
      }
    }
  };

  window.toggleVoiceSpeechSynthesis = function () {
    VOICE_STATE.speechEnabled = !VOICE_STATE.speechEnabled;
    const btn = document.getElementById('btn-voice-sound-toggle');
    if (btn) {
      btn.textContent = VOICE_STATE.speechEnabled ? '🔊' : '🔇';
      btn.title = VOICE_STATE.speechEnabled ? 'Speech audio enabled' : 'Speech audio muted';
    }
    if (!VOICE_STATE.speechEnabled && VOICE_STATE.synth) {
      VOICE_STATE.synth.cancel();
    }
  };

  window.simulateVoiceCommand = function (cmdText) {
    ChinnoduVoiceAI.renderUserSpeechBubble(cmdText);
    ChinnoduVoiceAI.handleVoiceInput(cmdText);
  };

  window.handleVoiceTextSubmit = function (e) {
    e.preventDefault();
    const input = document.getElementById('voice-text-fallback-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;

    ChinnoduVoiceAI.renderUserSpeechBubble(val);
    ChinnoduVoiceAI.handleVoiceInput(val);
    input.value = '';
  };

  // Keyboard shortcut: Press 'v' or 'V'
  document.addEventListener('keydown', (e) => {
    if (e.key === 'v' || e.key === 'V') {
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
        const overlay = document.getElementById('voice-ai-modal-overlay');
        if (overlay && !overlay.classList.contains('active')) {
          e.preventDefault();
          window.openVoiceAssistantModal();
        }
      }
    }
  });

  // Self-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ChinnoduVoiceAI.init);
  } else {
    ChinnoduVoiceAI.init();
  }

  window.ChinnoduVoiceAI = ChinnoduVoiceAI;
  window.ChinnoduNLPEngine = ChinnoduNLPEngine;
  window.ChinnoduMLModel = ChinnoduMLModel;
})();
