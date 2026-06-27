import re


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
    paragraphs = re.split(r"\n\s*\n", text.strip())
    chunks = []
    current = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(current) + len(para) + 1 <= chunk_size:
            current = (current + "\n\n" + para).strip()
        else:
            if current:
                chunks.append(current)
            if len(para) > chunk_size:
                sentences = re.split(r"(?<=[.!?])\s+", para)
                current = ""
                for sent in sentences:
                    if len(current) + len(sent) + 1 <= chunk_size:
                        current = (current + " " + sent).strip()
                    else:
                        if current:
                            chunks.append(current)
                        current = sent
            else:
                current = para

    if current:
        chunks.append(current)

    if overlap > 0 and len(chunks) > 1:
        overlapped = []
        for i, chunk in enumerate(chunks):
            if i == 0:
                overlapped.append(chunk)
            else:
                prev_tail = chunks[i - 1][-overlap:]
                overlapped.append(prev_tail + "\n" + chunk)
        chunks = overlapped

    return chunks if chunks else [text[:chunk_size]]
