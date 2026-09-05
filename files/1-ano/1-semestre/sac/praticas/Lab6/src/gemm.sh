#!/bin/sh
#SBATCH --ntasks=1
#SBATCH --nodes=1
#SBATCH --time=00:02:00
#SBATCH --partition=cpar

module load gcc/11.2.0
module load papi/5.4.1

cd $PBS_O_WORKDIR

if [ -z $3 ]; then
  echo "Using 1 thread"
  ./gemm $1 $2 1
else
  echo "Using "
  echo $3
  echo " threads";
  ./gemm $1 $2 $3
fi

