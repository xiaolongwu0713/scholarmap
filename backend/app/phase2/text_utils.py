"""Text normalization utilities for institution matching."""
import re
import unicodedata


def normalize_text(text: str) -> str:
    """Normalize text by removing diacritics and standardizing format.
    
    This function performs comprehensive text normalization:
    1. NFKC normalization: Handles compatibility characters (full-width, superscript, etc.)
    2. NFD + remove diacritics: Removes accents and diacritical marks
    3. Lowercase conversion
    4. Punctuation and whitespace normalization
    
    Args:
        text: Input text to normalize
    
    Returns:
        Normalized text string
    
    Examples:
        >>> normalize_text("École Polytechnique Fédérale")
        'ecole polytechnique federale'
        >>> normalize_text("Universität zu Köln")
        'universitat zu koln'
        >>> normalize_text("ＡＢＣ University")
        'abc university'
        >>> normalize_text("H₂O Institute")
        'h2o institute'
    """
    if not text or not text.strip():
        return ""
    
    # Step 1: NFKC normalization (Normalization Form Compatibility Composition)
    # Handles compatibility characters:
    # - Full-width characters (ＡＢＣ -> ABC)
    # - Superscript/subscript (² -> 2, ₁ -> 1)
    # - Ligatures (ﬁ -> fi, ﬃ -> ffi)
    # - Various compatibility forms
    text = unicodedata.normalize('NFKC', text)
    
    # Step 2: NFD normalization + remove diacritics (accents)
    # É -> E, é -> e, ü -> u, ö -> o, ñ -> n, etc.
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    
    # Step 3: Convert to lowercase
    text = text.lower()
    
    # Step 4: Remove special punctuation (keep spaces and hyphens for now)
    text = re.sub(r'[^\w\s-]', ' ', text)
    
    # Step 5: Normalize whitespace (multiple spaces -> single space)
    text = ' '.join(text.split())
    
    # Step 6: Normalize hyphens (optional - convert hyphens to spaces)
    text = text.replace(' - ', ' ').replace('-', ' ')
    
    # Final whitespace normalization (in case hyphen replacement created extra spaces)
    text = ' '.join(text.split())
    
    return text.strip()


def extract_abbreviation(text: str) -> str | None:
    """Extract abbreviation from text if it contains parentheses.
    
    Examples:
        >>> extract_abbreviation("Massachusetts Institute of Technology (MIT)")
        'MIT'
        >>> extract_abbreviation("University of California, Berkeley (UCB)")
        'UCB'
        >>> extract_abbreviation("Harvard University")
        None
    """
    if not text:
        return None
    
    # Look for pattern like "text (ABBREV)"
    match = re.search(r'\(([A-Z0-9\s]+)\)', text)
    if match:
        abbrev = match.group(1).strip()
        # Only return if it looks like an abbreviation (all caps, or numbers)
        if abbrev and (abbrev.isupper() or any(c.isdigit() for c in abbrev)):
            return abbrev
    
    return None
