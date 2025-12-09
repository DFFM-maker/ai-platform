"""
Industrial Model Router
Smart routing between Qwen2.5-Coder 14B and Mistral 7B based on query analysis
"""

from typing import Dict, Optional, List
import re
from app.prompts.industrial_prompts import (
    CODE_GENERATION_KEYWORDS,
    INTEGRATION_KEYWORDS,
    GENERAL_ASSISTANT_KEYWORDS,
    ARCHITECTURE_KEYWORDS,
    SYSTEM_PROMPT_PLC,
    SYSTEM_PROMPT_AUTOMATION,
    SYSTEM_PROMPT_MONITORING,
    SYSTEM_PROMPT_GENERAL_ASSISTANT,
    SYSTEM_PROMPT_ARCHITECTURE,
)


class IndustrialModelRouter:
    """
    Intelligently routes queries to the optimal model:
    - Qwen2.5-Coder 14B for PLC/C++ code generation
    - Mistral 7B (Industrial) for integrations, configs, automation
    - Mistral 7B (Assistant) for shopping, family, general help
    - Llama 3.1 8B for architecture education (IUAV)
    """
    
    def __init__(self):
        self.code_keywords = [kw.lower() for kw in CODE_GENERATION_KEYWORDS]
        self.integration_keywords = [kw.lower() for kw in INTEGRATION_KEYWORDS]
        self.general_keywords = [kw.lower() for kw in GENERAL_ASSISTANT_KEYWORDS]
        self.architecture_keywords = [kw.lower() for kw in ARCHITECTURE_KEYWORDS]
        
        # Model names
        self.qwen_14b = "qwen2.5-coder:14b-instruct-q4_K_M"
        self.mistral_7b = "mistral:7b-instruct-v0.3-q5_K_M"
        self.llama_8b = "llama3:8b"
        self.qwen_7b_fallback = "qwen2.5-coder:7b"  # If 14B OOM
    
    def route(
        self,
        query: str,
        context: Optional[Dict] = None,
        preset_override: Optional[str] = None
    ) -> str:
        """
        Determine which model to use based on query content and context.
        
        Args:
            query: User's input message
            context: Optional context dict (conversation history, metadata)
            preset_override: Force specific preset (e.g., 'plc_coding_sysmac')
        
        Returns:
            str: Model name to use (Ollama format)
        """
        
        # Priority 1: Preset override (user manually selected)
        if preset_override:
            if preset_override == "plc_coding_sysmac":
                return self.qwen_14b
            elif preset_override == "architecture_iuav":
                return self.llama_8b
            elif preset_override in ["industrial_consultant", "monitoring_expert", "general_assistant"]:
                return self.mistral_7b
            elif preset_override == "architecture_iuav":
                return self.llama_8b
        
        # Priority 2: Context-based forced model
        if context and context.get('force_model'):
            return context['force_model']
        
        query_lower = query.lower()
        
        # Priority 3: Check for category keywords (4-way routing)
        code_score = self._calculate_keyword_score(query_lower, self.code_keywords)
        integration_score = self._calculate_keyword_score(query_lower, self.integration_keywords)
        general_score = self._calculate_keyword_score(query_lower, self.general_keywords)
        architecture_score = self._calculate_keyword_score(query_lower, self.architecture_keywords)
        
        # Determine winner by highest score
        max_score = max(code_score, integration_score, general_score, architecture_score)
        
        if max_score == 0:
            # No keywords matched, use heuristics (see Priority 4 below)
            pass
        elif code_score == max_score:
            return self.qwen_14b
        elif architecture_score == max_score:
            return self.llama_8b
        else:
            # Both integration and general use Mistral 7B (different prompts)
            return self.mistral_7b
        
        # Priority 4: Heuristic-based analysis
        
        # Check for code-like patterns
        if self._contains_code_patterns(query):
            return self.qwen_14b
        
        # Check query length (very long = probably documentation/code)
        word_count = len(query.split())
        if word_count > 150:
            return self.qwen_14b  # Assume code snippet or detailed spec
        
        # Priority 5: Default to Mistral for general chat
        return self.mistral_7b
    
    def _calculate_keyword_score(self, text: str, keywords: List[str]) -> int:
        """Count how many keywords appear in text"""
        score = 0
        for keyword in keywords:
            if keyword in text:
                score += 1
        return score
    
    def _contains_code_patterns(self, text: str) -> bool:
        """Detect code-like patterns in text"""
        patterns = [
            r'\b(VAR|VAR_INPUT|VAR_OUTPUT|END_VAR)\b',  # IEC 61131-3
            r'\b(IF|THEN|ELSIF|ELSE|END_IF)\b',  # ST keywords
            r'\b(CASE|OF|END_CASE)\b',  # ST case
            r'\b(FOR|TO|DO|END_FOR)\b',  # ST loops
            r'\b(WHILE|END_WHILE)\b',  # ST while
            r'\b(FUNCTION_BLOCK|END_FUNCTION_BLOCK)\b',  # FB definition
            r'\b(void|int|float|bool|class|struct)\b',  # C++ keywords
            r'#include\s*<',  # C++ includes
            r':=',  # ST assignment
            r'->',  # Pointer/arrow operator
        ]
        
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False
    
    def get_system_prompt(
        self,
        model_name: str,
        preset_name: Optional[str] = None,
        query: Optional[str] = None
    ) -> str:
        """
        Get appropriate system prompt for the selected model.
        
        Args:
            model_name: Model name returned by route()
            preset_name: Optional preset override
            query: Original query (for auto-routing prompt selection)
        
        Returns:
            str: System prompt text
        """
        
        # Preset-based prompts (explicit user selection)
        if preset_name == "plc_coding_sysmac":
            return SYSTEM_PROMPT_PLC
        elif preset_name == "industrial_consultant":
            return SYSTEM_PROMPT_AUTOMATION
        elif preset_name == "monitoring_expert":
            return SYSTEM_PROMPT_MONITORING
        elif preset_name == "general_assistant":
            return SYSTEM_PROMPT_GENERAL_ASSISTANT
        elif preset_name == "architecture_iuav":
            return SYSTEM_PROMPT_ARCHITECTURE
        
        # Auto-routing prompt selection based on query
        if query:
            query_lower = query.lower()
            general_score = self._calculate_keyword_score(query_lower, self.general_keywords)
            integration_score = self._calculate_keyword_score(query_lower, self.integration_keywords)
            architecture_score = self._calculate_keyword_score(query_lower, self.architecture_keywords)
            
            if "llama3:8b" in model_name and architecture_score > 0:
                return SYSTEM_PROMPT_ARCHITECTURE
            elif "mistral:7b" in model_name:
                if general_score > integration_score:
                    return SYSTEM_PROMPT_GENERAL_ASSISTANT
                else:
                    return SYSTEM_PROMPT_AUTOMATION
        
        # Model-based default prompts
        if "qwen2.5-coder:14b" in model_name or "qwen2.5-coder:7b" in model_name:
            return SYSTEM_PROMPT_PLC
        elif "llama3:8b" in model_name:
            return SYSTEM_PROMPT_ARCHITECTURE  # Default for Llama 8B
        elif "mistral:7b" in model_name:
            return SYSTEM_PROMPT_AUTOMATION  # Default to consultant mode
        
        return ""  # No system prompt (use model default)
    
    def get_model_settings(self, model_name: str) -> Dict:
        """
        Get recommended inference settings for each model.
        
        Returns:
            dict: Settings for Ollama API call
        """
        if "qwen2.5-coder:14b" in model_name:
            return {
                "temperature": 0.3,  # Low for deterministic code
                "top_p": 0.9,
                "top_k": 40,
                "num_ctx": 16384,  # 16k context for manuals
                "num_predict": 2048,  # Max tokens to generate
                "repeat_penalty": 1.1,
            }
        elif "mistral:7b" in model_name:
            return {
                "temperature": 0.7,  # Higher for creative solutions
                "top_p": 0.95,
                "top_k": 50,
                "num_ctx": 8192,  # 8k sufficient for configs
                "num_predict": 1024,
                "repeat_penalty": 1.15,
            }
        elif "llama3:8b" in model_name:
            return {
                "temperature": 0.6,  # Balanced for academic work
                "top_p": 0.9,
                "top_k": 40,
                "num_ctx": 8192,  # 8k for essays and analysis
                "num_predict": 1024,
                "repeat_penalty": 1.1,
            }
        elif "qwen2.5-coder:7b" in model_name:
            # Fallback 7B settings
            return {
                "temperature": 0.3,
                "top_p": 0.9,
                "top_k": 40,
                "num_ctx": 16384,
                "num_predict": 2048,
                "repeat_penalty": 1.1,
            }
        else:
            # Default settings
            return {
                "temperature": 0.7,
                "top_p": 0.95,
                "num_ctx": 4096,
                "num_predict": 512,
            }
    
    def should_use_rag(self, query: str, model_name: str) -> bool:
        """
        Determine if RAG should be used for this query.
        
        Args:
            query: User query
            model_name: Selected model
        
        Returns:
            bool: True if RAG retrieval recommended
        """
        rag_keywords = [
            'manuale', 'manual', 'documentazione', 'documentation',
            'datasheet', 'specifica', 'specification',
            'come si', 'how to', 'esempio', 'example',
            'riferimento', 'reference',
        ]
        
        query_lower = query.lower()
        for keyword in rag_keywords:
            if keyword in query_lower:
                return True
        
        # Use RAG for monitoring queries (likely need dashboard examples)
        if any(kw in query_lower for kw in ['grafana', 'dashboard', 'panel', 'query']):
            return True
        
        return False
    
    def explain_routing_decision(
        self,
        query: str,
        selected_model: str
    ) -> str:
        """
        Generate human-readable explanation of why a model was selected.
        Useful for debugging and UI tooltips.
        
        Returns:
            str: Explanation in Italian
        """
        query_lower = query.lower()
        
        if "qwen2.5-coder:14b" in selected_model:
            if any(kw in query_lower for kw in ['st', 'structured text', 'plc', 'function block']):
                return "🔧 Rilevato codice PLC/Structured Text → Qwen 14B (code generation specialist)"
            elif any(kw in query_lower for kw in ['c++', 'cpp', 'embedded']):
                return "💻 Rilevato C++/embedded → Qwen 14B (code generation specialist)"
            else:
                return "📝 Query complessa/lunga → Qwen 14B (context esteso)"
        
        elif "llama3:8b" in selected_model:
            return "🏛️ Architettura/IUAV → Llama 3.1 8B (architecture education specialist)"
        
        elif "mistral:7b" in selected_model:
            # Check if general assistant mode
            if any(kw in query_lower for kw in ['amazon', 'acquisto', 'prodotto', 'recensione', 'anziani', 'braccialetto', 'sos']):
                return "🛒 Assistente shopping/famiglia → Mistral 7B (product recommendations)"
            elif any(kw in query_lower for kw in ['node-red', 'grafana', 'influxdb']):
                return "🔌 Rilevata integrazione industriale → Mistral 7B (integration expert)"
            elif any(kw in query_lower for kw in ['home assistant', 'yaml', 'automation']):
                return "🏠 Rilevata home automation → Mistral 7B (configuration expert)"
            else:
                return "💬 Chat generale → Mistral 7B (veloce e versatile)"
        
        return f"🤖 Modello selezionato: {selected_model}"


# ============================================================================
# Usage Example
# ============================================================================

if __name__ == "__main__":
    router = IndustrialModelRouter()
    
    test_queries = [
        "Genera codice Structured Text per un timer TON",
        "Come creo un flow Node-RED per leggere Modbus TCP?",
        "Write C++ function to read analog input 0-10V",
        "Crea dashboard Grafana per monitorare OEE",
        "Cos'è la differenza tra DINT e REAL?",
        "Configure Home Assistant automation for lights",
    ]
    
    print("=== Industrial Model Router Test ===\n")
    for query in test_queries:
        model = router.route(query)
        explanation = router.explain_routing_decision(query, model)
        settings = router.get_model_settings(model)
        use_rag = router.should_use_rag(query, model)
        
        print(f"Query: {query}")
        print(f"  → Model: {model}")
        print(f"  → Reason: {explanation}")
        print(f"  → Temperature: {settings['temperature']}")
        print(f"  → Context: {settings['num_ctx']} tokens")
        print(f"  → Use RAG: {'Yes' if use_rag else 'No'}")
        print()
