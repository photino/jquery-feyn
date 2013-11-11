
feyn.pdf : feyn.eps
	epspdf feyn.eps
	rm -f *.log *.aux *.t1 *.mp *.dvi

feyn.eps : feyn.dvi
	dvips feyn.dvi -E -o feyn.eps

feyn.dvi : feyn.tex
	latex feyn.tex

