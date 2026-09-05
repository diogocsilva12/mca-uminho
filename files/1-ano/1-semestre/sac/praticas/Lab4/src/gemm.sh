#!/bin/sh
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --time=00:02:00
#SBATCH --partition=cpar

module load gcc/11.2.0
module load papi/5.4.1

./gemm $1 $2

