#!/bin/sh
#SBATCH --ntasks=1
#SBATCH --nodes=1
#SBATCH --time=00:02:00
#SBATCH --partition=cpar

module load gcc/11.2.0
module load papi/5.4.1

./Challenge $1

