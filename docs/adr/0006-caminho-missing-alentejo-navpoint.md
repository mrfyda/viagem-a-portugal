# Caminho EPUB lacks the Alentejo chapter navPoint

The Caminho EPUB has a production defect: chapter 5, "A grande e ardente
terra de Alentejo", has no TOC navPoint and its title is typeset as plain
body text (`<p class="Texto">`) inside chapter 4's HTML file, so its
sections are numbered under chapter 4's markers. The section pipeline
hard-codes a split at the literal title string in that file. Verified
against the Companhia das Letras TOC, which lists all six chapters.
