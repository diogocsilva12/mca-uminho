#!/bin/sh
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --time=00:05:00
#SBATCH --partition=gpu
#SBATCH --gres=gpu:1
#SBATCH --account=f202500010hpcvlabuminhox

# Carregar módulos (verifica se funcionam, senão tenta 'module load cuda')
module load GCC/11.3.0
module load CUDA/12.2.0

echo "Compiling..."
make

echo "Running GPU Tests..."

# [cite_start]Task 2.6 requer testar os 3 tamanhos [cite: 71]

echo "=== GPU TESTE 1: L1 Cache Fit (Size 14) ==="
./bin/jacobi_cuda 14 14 14 1000

echo "=== GPU TESTE 2: LLC Cache Fit (Size 100) ==="
./bin/jacobi_cuda 100 100 100 1000

echo "=== GPU TESTE 3: RAM Bound (Size 512) ==="
./bin/jacobi_cuda 512 512 512 100