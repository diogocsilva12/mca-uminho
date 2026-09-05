CXX := g++
CXXFLAGS := -O3 -std=c++17 -fopenmp -march=native
NVCC := nvcc
NVCCFLAGS := -O3 -arch=sm_80  # sm_80 é a arquitetura da A100

SRC_DIR := src
BIN_DIR := bin

# Lista de executáveis
TARGETS := $(BIN_DIR)/jacobi_base $(BIN_DIR)/jacobi_omp $(BIN_DIR)/jacobi_cuda

all: $(TARGETS)

# Compila CPU Base
$(BIN_DIR)/jacobi_base: $(SRC_DIR)/jacobi-original.cpp
	@mkdir -p $(BIN_DIR)
	$(CXX) $(CXXFLAGS) -o $@ $<

# Compila CPU OpenMP
$(BIN_DIR)/jacobi_omp: $(SRC_DIR)/jacobi_omp.cpp
	@mkdir -p $(BIN_DIR)
	$(CXX) $(CXXFLAGS) -o $@ $<

# Compila GPU CUDA (NOVO)
$(BIN_DIR)/jacobi_cuda: $(SRC_DIR)/jacobi_cuda.cu
	@mkdir -p $(BIN_DIR)
	$(NVCC) $(NVCCFLAGS) -o $@ $<

clean:
	rm -rf $(BIN_DIR)