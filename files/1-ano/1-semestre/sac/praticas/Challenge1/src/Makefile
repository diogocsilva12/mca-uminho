# source files.
SRC = Challenge.c Challenge0.o my_papi.c main.c

OBJ = $(SRC)

OUT = Challenge

# include directories
INCLUDES = -I. -I/share/apps/papi/5.4.1/include
 
# library directories
LIBDIRS = -L/share/apps/papi/5.4.1/lib
 
# C compiler flags 
CCFLAGS = -O2 -Wall -march=ivybridge -D OPT_SELECTION=1

# compiler
CCC = gcc 

# libraries
LIBS = -lm -lpapi

.SUFFIXES: .cpp .c 


default: $(OUT)

$(OUT): $(OBJ)
	module load gcc/11.2.0 papi/5.4.1 ; \
	$(CCC) -o $(OUT) $(CCFLAGS) $(INCLUDES) $(OBJ) $(LIBS) $(LIBDIRS)

depend:  dep
#
#dep:
#	makedepend -- $(CFLAGS) -- $(INCLUDES) $(SRC)

clean:
	rm -f $(OUT)
